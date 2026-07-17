use jobsentinel_documents::{
    AtsAnalyzer, AtsResumeData, ExportResumeData, ExportTemplateId, ResumeAnalysisInput,
    ResumeData as TemplateResumeData, ResumeExporter, StructuredResume, TemplateId,
    TemplateRenderer,
};

const STRUCTURED_RESUME_FIXTURE: &str = include_str!("fixtures/structured_resume.json");
const TEMPLATE_RESUME_FIXTURE: &str = include_str!("fixtures/template_resume.json");
const EXPORT_RESUME_FIXTURE: &str = include_str!("fixtures/export_resume.json");
const ATS_RESUME_FIXTURE: &str = include_str!("fixtures/ats_resume.json");

#[test]
fn structured_resume_fixture_round_trips_without_field_drift() {
    let resume: StructuredResume = serde_json::from_str(STRUCTURED_RESUME_FIXTURE).unwrap();
    let serialized = serde_json::to_value(&resume).unwrap();
    let fixture: serde_json::Value = serde_json::from_str(STRUCTURED_RESUME_FIXTURE).unwrap();

    assert_eq!(serialized, fixture);
    assert_eq!(
        serde_json::from_value::<StructuredResume>(serialized).unwrap(),
        resume
    );
}

#[test]
fn template_id_supports_rendering_ids_and_legacy_export_aliases() {
    let cases = [
        ("classic", TemplateId::Classic, "\"Classic\""),
        ("modern", TemplateId::Modern, "\"Modern\""),
        ("technical", TemplateId::Technical, "\"Technical\""),
        ("executive", TemplateId::Executive, "\"Executive\""),
        ("military", TemplateId::Military, "\"Military\""),
        ("professional", TemplateId::Professional, "\"Professional\""),
        ("traditional", TemplateId::Traditional, "\"Traditional\""),
    ];

    for (input, expected, serialized) in cases {
        assert_eq!(input.parse::<TemplateId>().unwrap(), expected);
        assert_eq!(expected.as_str(), input);
        assert_eq!(serde_json::to_string(&expected).unwrap(), serialized);
        assert_eq!(
            serde_json::from_str::<TemplateId>(serialized).unwrap(),
            expected
        );
    }

    assert_eq!(TemplateId::Professional.rendering_id(), TemplateId::Classic);
    assert_eq!(
        TemplateId::Traditional.rendering_id(),
        TemplateId::Executive
    );
    assert!("unknown".parse::<TemplateId>().is_err());
}

#[test]
fn template_adapter_round_trips_fixture_and_preserves_html() {
    let legacy: TemplateResumeData = serde_json::from_str(TEMPLATE_RESUME_FIXTURE).unwrap();
    let original_json = serde_json::to_value(&legacy).unwrap();
    let original_html = TemplateRenderer::render_html(&legacy, TemplateId::Classic);

    let restored = TemplateResumeData::from(StructuredResume::from(legacy));

    assert_eq!(serde_json::to_value(&restored).unwrap(), original_json);
    assert_eq!(
        TemplateRenderer::render_html(&restored, TemplateId::Classic),
        original_html
    );
}

#[test]
fn export_adapter_round_trips_fixture_and_preserves_outputs() {
    let legacy: ExportResumeData = serde_json::from_str(EXPORT_RESUME_FIXTURE).unwrap();
    let original_json = serde_json::to_value(&legacy).unwrap();
    let original_text = ResumeExporter::export_text(&legacy);
    let original_docx =
        ResumeExporter::export_docx(&legacy, ExportTemplateId::Professional).unwrap();

    let restored = ExportResumeData::from(StructuredResume::from(legacy));

    assert_eq!(serde_json::to_value(&restored).unwrap(), original_json);
    assert_eq!(ResumeExporter::export_text(&restored), original_text);
    assert_eq!(
        ResumeExporter::export_docx(&restored, ExportTemplateId::Professional).unwrap(),
        original_docx
    );
}

#[test]
fn ats_adapter_round_trips_fixture_and_preserves_analysis() {
    let legacy: AtsResumeData = serde_json::from_str(ATS_RESUME_FIXTURE).unwrap();
    let original_json = serde_json::to_value(&legacy).unwrap();
    let original_analysis = serde_json::to_value(AtsAnalyzer::analyze_format(&legacy)).unwrap();

    let restored = AtsResumeData::from(ResumeAnalysisInput::from(legacy));

    assert_eq!(serde_json::to_value(&restored).unwrap(), original_json);
    assert_eq!(
        serde_json::to_value(AtsAnalyzer::analyze_format(&restored)).unwrap(),
        original_analysis
    );
}
