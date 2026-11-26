//! Discovers screening controls with protected context before applying saved answers.

use super::*;

impl FormFiller {
    /// Fill screening questions using stored answer patterns
    ///
    /// Finds question labels on the page, matches them against stored patterns,
    /// and fills the corresponding inputs with configured answers.
    pub(super) async fn fill_screening_questions(
        &self,
        page: &AutomationPage,
        result: &mut FillResult,
    ) {
        let Ok(inputs) = page
            .inner()
            .find_elements("input:not([type=hidden]), select, textarea")
            .await
        else {
            return;
        };
        for input in inputs {
            let Ok(found) = input.call_js_fn(SCREENING_CONTROL, false).await else {
                continue;
            };
            let Some(question_text) = found
                .result
                .value
                .and_then(|value| value.as_str().map(str::to_owned))
            else {
                continue;
            };
            if requires_user_answer(&question_text) {
                result.add_manual_review_topic();
                continue;
            }
            let Some(answer) = self.find_screening_answer_for_question(&question_text) else {
                continue;
            };
            let arguments = serde_json::json!([question_text, answer.answer]);
            let write =
                format!("function() {{ return ({SCREENING_CONTROL}).apply(this, {arguments}); }}");
            if input
                .call_js_fn(write, false)
                .await
                .ok()
                .and_then(|response| response.result.value)
                == Some(serde_json::Value::Bool(true))
            {
                result.filled_fields.push(SCREENING_FIELD_LABEL.to_string());
                result.add_screening_answer_topic(screening_answer_review_topic(
                    &answer.question_pattern,
                ));
            } else {
                result.add_manual_review_topic();
            }
        }
    }

    /// Find matching answer for a question text
    #[cfg(test)]
    pub(super) fn find_answer_for_question(&self, question: &str) -> Option<String> {
        self.find_screening_answer_for_question(question)
            .map(|answer| answer.answer.clone())
    }

    fn find_screening_answer_for_question(&self, question: &str) -> Option<&ScreeningAnswer> {
        if requires_user_answer(question) {
            return None;
        }

        for answer in &self.screening_answers {
            if requires_user_answer(&answer.question_pattern) {
                continue;
            }

            if screening_question_matches(&answer.question_pattern, question) {
                tracing::debug!(
                    pattern_chars = answer.question_pattern.chars().count(),
                    question_chars = question.chars().count(),
                    "Matched saved screening answer"
                );
                return Some(answer);
            }
        }

        None
    }
}

const SCREENING_CONTROL: &str = r#"
            function(expected, value) {
                const texts = new Set();
                const editable = input => input?.matches('input:not([type="hidden"]), select, textarea');
                const add = (input, text) => {
                    if (input === this && editable(input) && text?.trim()) texts.add(text.trim());
                };
                add(this, this.getAttribute('aria-label'));
                for (const label of this.labels || []) add(this, label.textContent);
                const labels = document.querySelectorAll('div.field label, div.application-question label, div.question-field label, [data-qa="question-label"], [data-automation-id*="question"], label.WGAE, fieldset legend, div.form-group label, .question label, label[for]');
                for (const label of labels) {
                    let input = label.control || (label.htmlFor && document.getElementById(label.htmlFor));
                    if (!input) {
                        const sibling = label.nextElementSibling;
                        input = editable(sibling) ? sibling : sibling?.querySelector('input:not([type="hidden"]), select, textarea');
                    }
                    if (!input) input = label.closest('.field, .form-group, .question, fieldset')?.querySelector('input:not([type="hidden"]), select, textarea');
                    add(input, label.textContent);
                }
                const input = this;
                // Every enclosing group contributes context, even for generic child labels.
                for (let node = input; node; node = node.parentElement) {
                    if (node === input || node.matches('fieldset, [role="group"], [role="radiogroup"], .field, .form-group, .question')) {
                        add(input, node.getAttribute('aria-label'));
                        for (const attribute of ['aria-labelledby', 'aria-describedby']) {
                            for (const id of (node.getAttribute(attribute) || '').split(/\s+/).filter(Boolean)) {
                                add(input, document.getElementById(id)?.textContent);
                            }
                        }
                        if (node.tagName === 'FIELDSET') {
                            for (const legend of node.querySelectorAll(':scope > legend')) add(input, legend.textContent);
                        }
                    }
                }
                const selectors = [];
                if (input.id) selectors.push('#' + CSS.escape(input.id));
                if (input.name) selectors.push(`[name="${CSS.escape(input.name)}"]`);
                const attributes = Array.from(input.attributes).filter(a => a.name.startsWith('data-'));
                if (attributes.length) selectors.push(input.tagName.toLowerCase() + attributes.map(a => `[${CSS.escape(a.name)}="${CSS.escape(a.value)}"]`).join(''));
                const selector = selectors.find(candidate => {
                    const matches = document.querySelectorAll(candidate);
                    return matches.length === 1 && matches[0] === input;
                });
                const context = selector && texts.size ? Array.from(texts).join(' ') : null;
                if (expected === undefined) return context;
                if (!this.isConnected || !context || context !== expected || this.matches(':disabled') || this.readOnly) return false;
                let next = value;
                if (this.tagName === 'SELECT') {
                    const option = Array.from(this.options).find(option => option.value === value || option.textContent.trim() === value);
                    if (!option || option.matches(':disabled')) return false;
                    next = option.value;
                } else if (this.tagName === 'INPUT' && ['hidden', 'file', 'radio', 'checkbox', 'button', 'submit', 'reset'].includes(this.type)) return false;
                const prototype = this.tagName === 'SELECT' ? HTMLSelectElement.prototype : this.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
                Object.getOwnPropertyDescriptor(prototype, 'value').set.call(this, next);
                this.dispatchEvent(new Event('input', { bubbles: true }));
                this.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            }
"#;
