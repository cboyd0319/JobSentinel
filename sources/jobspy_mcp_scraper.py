"""
JobSpy MCP scraper for multi-site job aggregation.

Aggregates jobs from Indeed, LinkedIn, ZipRecruiter, Glassdoor, and more.
Risk Level: MEDIUM-HIGH (aggregates scrapers, expect failures)
"""

from __future__ import annotations

import asyncio
import json
import subprocess
from typing import Dict, List, Optional

from utils.logging import get_logger
from sources.job_scraper_base import JobBoardScraper, GenericJobExtractor

logger = get_logger("sources.jobspy_mcp_scraper")


class JobSpyMCPScraper(JobBoardScraper):
	"""Multi-site job aggregator using JobSpy MCP server.

	Provides multi-board search (Indeed, ZipRecruiter, Glassdoor, Google Jobs, etc.).
	Risk: Medium/High (aggregation brittleness, potential ToS concerns).
	"""

	def __init__(self, mcp_server_path: Optional[str] = None):
		super().__init__(name="JobSpy MCP", base_domains=[])
		self.extractor = GenericJobExtractor()
		self.mcp_server_path = mcp_server_path or self._find_jobspy_server()

	def can_handle(self, url: str) -> bool:  # noqa: D401
		"""JobSpy is keyword-based, not URL-based."""
		return False

	def _find_jobspy_server(self) -> Optional[str]:
		"""Try to locate JobSpy MCP server installation."""
		import os

		possible_paths = [
			os.path.expanduser("~/jobspy-mcp-server/src/index.js"),
			os.path.expanduser("~/.local/share/jobspy-mcp-server/src/index.js"),
			"/opt/jobspy-mcp-server/src/index.js",
		]
		for path in possible_paths:
			if os.path.exists(path):
				logger.info(f"Found JobSpy MCP server at {path}")
				return path
		logger.warning(
			"JobSpy MCP server not found. Install from: https://github.com/borgius/jobspy-mcp-server"
		)
		return None

	async def scrape(
		self, board_url: str, fetch_descriptions: bool = True  # noqa: D401
	) -> List[Dict]:
		"""Not used - use search() instead."""
		logger.warning("JobSpy MCP doesn't scrape URLs. Use search() instead.")
		return []

	async def search(
		self,
		keywords: Optional[List[str]] = None,
		location: Optional[str] = None,
		site_names: Optional[List[str]] = None,
		results_wanted: int = 50,
		hours_old: int = 72,
		country: str = "USA",
		is_remote: Optional[bool] = None,
		job_type: Optional[str] = None,
	) -> List[Dict]:
		"""Search multiple job boards via JobSpy MCP."""
		if not self.mcp_server_path:
			logger.error("JobSpy MCP server not found. Cannot search.")
			return []
		if not keywords:
			logger.warning("No keywords provided for JobSpy search")
			return []
		if site_names is None:
			site_names = ["indeed", "zip_recruiter", "glassdoor", "google"]

		search_query = " ".join(keywords) if isinstance(keywords, list) else keywords
		logger.info(
			f"Searching JobSpy ({', '.join(site_names)}) for: {search_query}"
		)
		try:
			mcp_request = {
				"method": "tools/call",
				"params": {
					"name": "search_jobs",
					"arguments": {
						"query": search_query,
						"location": location or "Remote",
						"site_name": site_names,
						"results_wanted": results_wanted,
						"hours_old": hours_old,
						"country_indeed": country,
					},
				},
			}
			if is_remote is not None:
				mcp_request["params"]["arguments"]["is_remote"] = is_remote
			if job_type:
				mcp_request["params"]["arguments"]["job_type"] = job_type

			result = subprocess.run(
				["node", self.mcp_server_path],
				input=json.dumps(mcp_request).encode(),
				capture_output=True,
				timeout=120,
			)
			if result.returncode != 0:
				logger.error(f"JobSpy MCP error: {result.stderr.decode()}")
				return []

			response = json.loads(result.stdout.decode())
			jobs_data = response.get("result", {}).get("jobs", [])

			logger.info(
				f"Found {len(jobs_data)} jobs from JobSpy MCP across {len(site_names)} sites"
			)
			site_counts = {}
			for job in jobs_data:
				site = job.get("site", "unknown")
				site_counts[site] = site_counts.get(site, 0) + 1
			for site, count in site_counts.items():
				logger.info(f" - {site}: {count} jobs")
			return await self._process_results(jobs_data)
		except subprocess.TimeoutExpired:
			logger.error("JobSpy MCP request timed out (multi-site scraping can be slow)")
			return []
		except FileNotFoundError:
			logger.error("Node.js not found. JobSpy MCP requires Node.js v16+")
			return []
		except Exception as e:
			logger.error(f"JobSpy MCP search failed: {e}")
			return []

	async def _process_results(self, jobs_data: List[Dict]) -> List[Dict]:
		"""Convert JobSpy results to normalized schema."""
		normalized_jobs: List[Dict] = []
		for job in jobs_data:
			raw_job = {
				"title": job.get("title", "N/A"),
				"company": job.get("company", "Unknown"),
				"location": job.get("location", "Not Specified"),
				"url": job.get("job_url", "#"),
				"description": job.get("description", ""),
				"id": job.get("id", ""),
				"posted_date": job.get("date_posted", ""),
				"salary": self._format_salary(job),
				"employment_type": job.get("job_type", "Full-time"),
				"external_job_id": job.get("id", ""),
			}
			source_site = job.get("site", "unknown")
			normalized_job = self.extractor.normalize_job_data(
				raw_job,
				raw_job["company"],
				f"jobspy_{source_site}",
				raw_job["url"],
			)
			normalized_job["jobspy_site"] = source_site
			normalized_job["jobspy_interval"] = job.get("interval", "")
			normalized_job["jobspy_min_amount"] = job.get("min_amount")
			normalized_job["jobspy_max_amount"] = job.get("max_amount")
			# Provide a canonical 'source' alias (some downstream consumers expect it)
			if "source" not in normalized_job:
				normalized_job["source"] = f"jobspy_{source_site}"
			comp = job.get("compensation", {})
			if isinstance(comp, dict):
				if comp.get("min_amount"):
					normalized_job["salary_min"] = comp["min_amount"]
				if comp.get("max_amount"):
					normalized_job["salary_max"] = comp["max_amount"]
				if comp.get("currency"):
					normalized_job["salary_currency"] = comp["currency"]
				if comp.get("interval"):
					normalized_job["salary_frequency"] = comp["interval"]
			if job.get("is_remote") is not None:
				normalized_job["remote"] = job["is_remote"]
			normalized_jobs.append(normalized_job)
		return normalized_jobs

	def _format_salary(self, job: Dict) -> str:
		"""Format salary from JobSpy compensation data."""
		comp = job.get("compensation")
		if not comp:
			return ""
		if isinstance(comp, dict):
			min_amt = comp.get("min_amount")
			max_amt = comp.get("max_amount")
			currency = comp.get("currency", "$")
			interval = comp.get("interval", "")
			if min_amt and max_amt:
				salary_str = f"{currency}{min_amt:,} - {currency}{max_amt:,}"
			elif max_amt:
				salary_str = f"{currency}{max_amt:,}"
			elif min_amt:
				salary_str = f"{currency}{min_amt:,}"
			else:
				return ""
			if interval:
				salary_str += f" {interval}"
			return salary_str
		return str(comp)


# Convenience function
async def search_multi_site_jobs(
	keywords: List[str],
	location: Optional[str] = None,
	sites: Optional[List[str]] = None,
	results_per_site: int = 50,
	hours_old: int = 72,
) -> List[Dict]:
	"""Convenience wrapper to perform a multi-site JobSpy search."""
	if sites is None:
		sites = ["indeed", "zip_recruiter", "glassdoor", "google"]
	scraper = JobSpyMCPScraper()
	return await scraper.search(
		keywords=keywords,
		location=location,
		site_names=sites,
		results_wanted=results_per_site,
		hours_old=hours_old,
	)
