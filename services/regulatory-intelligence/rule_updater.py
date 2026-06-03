"""
Knowledge Nexus Framework™ - Automatic Rule Update Module

This module handles automatic daily updates of CMS rules:
- CMS API Integration: Pull daily updates from CMS Open Payments API
- Web Scraping: Monitor CMS website for new guidance documents
- Knowledge Artifacts: Codify rules into JSON-based repository
"""

import asyncio
import logging
import json
import aiohttp
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import re
import hashlib
from pathlib import Path
import yaml

# Web scraping imports
try:
    from bs4 import BeautifulSoup
    import feedparser
    SCRAPING_AVAILABLE = True
except ImportError:
    SCRAPING_AVAILABLE = False
    logging.warning("Web scraping libraries not available. Install with: pip install beautifulsoup4 feedparser")

logger = logging.getLogger(__name__)

class RuleType(Enum):
    """Types of regulatory rules"""
    DE_MINIMIS_THRESHOLD = "de_minimis_threshold"
    COVERED_RECIPIENT_TYPE = "covered_recipient_type"
    NATURE_OF_PAYMENT = "nature_of_payment"
    REPORTING_REQUIREMENT = "reporting_requirement"
    STATE_SPECIFIC = "state_specific"
    GUIDANCE_DOCUMENT = "guidance_document"
    LEGISLATIVE_CHANGE = "legislative_change"

class RuleStatus(Enum):
    """Rule status"""
    ACTIVE = "active"
    PENDING = "pending"
    EXPIRED = "expired"
    SUPERSEDED = "superseded"

@dataclass
class RegulatoryRule:
    """Represents a regulatory rule"""
    rule_id: str
    rule_type: RuleType
    title: str
    description: str
    effective_date: datetime
    expiration_date: Optional[datetime] = None
    status: RuleStatus = RuleStatus.ACTIVE
    source: str = ""
    url: str = ""
    content: str = ""
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    version: str = "1.0"
    hash: str = ""

@dataclass
class UpdateResult:
    """Result of rule update operation"""
    success: bool
    rules_updated: int
    rules_added: int
    rules_expired: int
    errors: List[str]
    processing_time: float
    last_update: datetime

class CMSAPIMonitor:
    """Monitors CMS Open Payments API for updates"""
    
    def __init__(self, api_base_url: str = "https://openpaymentsdata.cms.gov/api/v1"):
        self.api_base_url = api_base_url
        self.session = None
        self.last_check = None
        self.update_endpoints = {
            'de_minimis': '/de-minimis-thresholds',
            'recipient_types': '/covered-recipient-types',
            'payment_nature': '/nature-of-payment-categories',
            'reporting_requirements': '/reporting-requirements'
        }

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def check_for_updates(self) -> List[RegulatoryRule]:
        """Check for updates in CMS API"""
        rules = []
        
        try:
            for endpoint_name, endpoint in self.update_endpoints.items():
                endpoint_rules = await self._check_endpoint(endpoint_name, endpoint)
                rules.extend(endpoint_rules)
            
            self.last_check = datetime.now()
            logger.info(f"Checked CMS API for updates, found {len(rules)} new/updated rules")
            
        except Exception as e:
            logger.error(f"Error checking CMS API for updates: {str(e)}")
        
        return rules

    async def _check_endpoint(self, endpoint_name: str, endpoint: str) -> List[RegulatoryRule]:
        """Check a specific API endpoint for updates"""
        rules = []
        
        try:
            url = f"{self.api_base_url}{endpoint}"
            
            # Simulate API call (replace with actual CMS API integration)
            await asyncio.sleep(0.1)
            
            # Mock response data
            mock_data = self._get_mock_endpoint_data(endpoint_name)
            
            for item in mock_data:
                rule = self._parse_api_response(endpoint_name, item)
                if rule:
                    rules.append(rule)
            
        except Exception as e:
            logger.error(f"Error checking endpoint {endpoint}: {str(e)}")
        
        return rules

    def _get_mock_endpoint_data(self, endpoint_name: str) -> List[Dict[str, Any]]:
        """Get mock data for testing (replace with actual API calls)"""
        mock_data = {
            'de_minimis': [
                {
                    'threshold': 11.04,
                    'currency': 'USD',
                    'effective_date': '2024-01-01',
                    'description': 'Annual de minimis threshold for 2024'
                }
            ],
            'recipient_types': [
                {
                    'type': 'Physician',
                    'code': 'PHYS',
                    'description': 'Licensed physician or doctor of medicine',
                    'effective_date': '2024-01-01'
                },
                {
                    'type': 'Teaching Hospital',
                    'code': 'TH',
                    'description': 'Teaching hospital as defined by CMS',
                    'effective_date': '2024-01-01'
                }
            ],
            'payment_nature': [
                {
                    'category': 'Consulting Fee',
                    'code': 'CONSULT',
                    'description': 'Payment for consulting services',
                    'effective_date': '2024-01-01'
                },
                {
                    'category': 'Speaking Fee',
                    'code': 'SPEAK',
                    'description': 'Payment for speaking engagements',
                    'effective_date': '2024-01-01'
                }
            ]
        }
        
        return mock_data.get(endpoint_name, [])

    def _parse_api_response(self, endpoint_name: str, data: Dict[str, Any]) -> Optional[RegulatoryRule]:
        """Parse API response into RegulatoryRule object"""
        try:
            rule_type_map = {
                'de_minimis': RuleType.DE_MINIMIS_THRESHOLD,
                'recipient_types': RuleType.COVERED_RECIPIENT_TYPE,
                'payment_nature': RuleType.NATURE_OF_PAYMENT,
                'reporting_requirements': RuleType.REPORTING_REQUIREMENT
            }
            
            rule_type = rule_type_map.get(endpoint_name, RuleType.GUIDANCE_DOCUMENT)
            
            # Generate unique rule ID
            rule_id = self._generate_rule_id(endpoint_name, data)
            
            # Parse effective date
            effective_date = datetime.strptime(data.get('effective_date', '2024-01-01'), '%Y-%m-%d')
            
            rule = RegulatoryRule(
                rule_id=rule_id,
                rule_type=rule_type,
                title=data.get('title', f"{endpoint_name.replace('_', ' ').title()} Update"),
                description=data.get('description', ''),
                effective_date=effective_date,
                source='cms_api',
                url=f"{self.api_base_url}/{endpoint_name}",
                content=json.dumps(data),
                tags=[endpoint_name, 'cms_api'],
                metadata=data
            )
            
            # Generate content hash
            rule.hash = self._generate_content_hash(rule)
            
            return rule
            
        except Exception as e:
            logger.error(f"Error parsing API response: {str(e)}")
            return None

    def _generate_rule_id(self, endpoint_name: str, data: Dict[str, Any]) -> str:
        """Generate unique rule ID"""
        content = f"{endpoint_name}_{json.dumps(data, sort_keys=True)}"
        return hashlib.md5(content.encode()).hexdigest()[:12]

    def _generate_content_hash(self, rule: RegulatoryRule) -> str:
        """Generate content hash for change detection"""
        content = f"{rule.title}_{rule.description}_{rule.content}_{rule.effective_date}"
        return hashlib.sha256(content.encode()).hexdigest()

class CMSWebScraper:
    """Scrapes CMS website for new guidance documents and legislative changes"""
    
    def __init__(self, base_url: str = "https://www.cms.gov"):
        self.base_url = base_url
        self.session = None
        self.monitored_pages = [
            '/openpayments',
            '/openpayments/guidance',
            '/openpayments/legislation',
            '/openpayments/updates'
        ]
        self.rss_feeds = [
            f"{base_url}/openpayments/rss",
            f"{base_url}/news/rss"
        ]

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def scrape_for_updates(self) -> List[RegulatoryRule]:
        """Scrape CMS website for updates"""
        rules = []
        
        if not SCRAPING_AVAILABLE:
            logger.warning("Web scraping libraries not available")
            return rules
        
        try:
            # Check RSS feeds
            for feed_url in self.rss_feeds:
                feed_rules = await self._check_rss_feed(feed_url)
                rules.extend(feed_rules)
            
            # Check monitored pages
            for page_path in self.monitored_pages:
                page_rules = await self._check_web_page(page_path)
                rules.extend(page_rules)
            
            logger.info(f"Scraped CMS website, found {len(rules)} new/updated rules")
            
        except Exception as e:
            logger.error(f"Error scraping CMS website: {str(e)}")
        
        return rules

    async def _check_rss_feed(self, feed_url: str) -> List[RegulatoryRule]:
        """Check RSS feed for updates"""
        rules = []
        
        try:
            async with self.session.get(feed_url) as response:
                if response.status == 200:
                    content = await response.text()
                    feed = feedparser.parse(content)
                    
                    for entry in feed.entries:
                        rule = self._parse_rss_entry(entry)
                        if rule:
                            rules.append(rule)
            
        except Exception as e:
            logger.error(f"Error checking RSS feed {feed_url}: {str(e)}")
        
        return rules

    async def _check_web_page(self, page_path: str) -> List[RegulatoryRule]:
        """Check web page for updates"""
        rules = []
        
        try:
            url = f"{self.base_url}{page_path}"
            async with self.session.get(url) as response:
                if response.status == 200:
                    content = await response.text()
                    page_rules = self._parse_web_page(content, url)
                    rules.extend(page_rules)
            
        except Exception as e:
            logger.error(f"Error checking web page {page_path}: {str(e)}")
        
        return rules

    def _parse_rss_entry(self, entry) -> Optional[RegulatoryRule]:
        """Parse RSS entry into RegulatoryRule"""
        try:
            # Determine rule type based on content
            rule_type = self._determine_rule_type_from_content(entry.title, entry.description)
            
            # Parse publication date
            pub_date = datetime.now()
            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                pub_date = datetime(*entry.published_parsed[:6])
            
            rule = RegulatoryRule(
                rule_id=self._generate_rule_id_from_url(entry.link),
                rule_type=rule_type,
                title=entry.title,
                description=entry.description,
                effective_date=pub_date,
                source='cms_website',
                url=entry.link,
                content=entry.description,
                tags=self._extract_tags_from_content(entry.title, entry.description)
            )
            
            rule.hash = self._generate_content_hash(rule)
            
            return rule
            
        except Exception as e:
            logger.error(f"Error parsing RSS entry: {str(e)}")
            return None

    def _parse_web_page(self, content: str, url: str) -> List[RegulatoryRule]:
        """Parse web page content for rules"""
        rules = []
        
        try:
            soup = BeautifulSoup(content, 'html.parser')
            
            # Look for specific patterns in the page
            # This is a simplified example - in practice, you'd need more sophisticated parsing
            
            # Find headings that might indicate new rules
            headings = soup.find_all(['h1', 'h2', 'h3'])
            for heading in headings:
                text = heading.get_text().strip()
                if self._is_rule_related(text):
                    rule = self._create_rule_from_heading(heading, url)
                    if rule:
                        rules.append(rule)
            
        except Exception as e:
            logger.error(f"Error parsing web page: {str(e)}")
        
        return rules

    def _determine_rule_type_from_content(self, title: str, description: str) -> RuleType:
        """Determine rule type from content"""
        content = f"{title} {description}".lower()
        
        if 'de minimis' in content or 'threshold' in content:
            return RuleType.DE_MINIMIS_THRESHOLD
        elif 'recipient' in content or 'physician' in content:
            return RuleType.COVERED_RECIPIENT_TYPE
        elif 'payment' in content and 'nature' in content:
            return RuleType.NATURE_OF_PAYMENT
        elif 'guidance' in content or 'instruction' in content:
            return RuleType.GUIDANCE_DOCUMENT
        elif 'legislation' in content or 'law' in content:
            return RuleType.LEGISLATIVE_CHANGE
        else:
            return RuleType.GUIDANCE_DOCUMENT

    def _extract_tags_from_content(self, title: str, description: str) -> List[str]:
        """Extract relevant tags from content"""
        content = f"{title} {description}".lower()
        tags = []
        
        # Common tags
        tag_keywords = {
            'openpayments': ['open payments', 'openpayments'],
            'cms': ['cms', 'centers for medicare'],
            'physician': ['physician', 'doctor', 'md'],
            'hospital': ['hospital', 'teaching hospital'],
            'reporting': ['reporting', 'disclosure'],
            'compliance': ['compliance', 'regulatory']
        }
        
        for tag, keywords in tag_keywords.items():
            if any(keyword in content for keyword in keywords):
                tags.append(tag)
        
        return tags

    def _is_rule_related(self, text: str) -> bool:
        """Check if text is related to regulatory rules"""
        rule_keywords = [
            'update', 'change', 'new', 'guidance', 'requirement',
            'threshold', 'de minimis', 'reporting', 'compliance'
        ]
        
        return any(keyword in text.lower() for keyword in rule_keywords)

    def _create_rule_from_heading(self, heading, url: str) -> Optional[RegulatoryRule]:
        """Create rule from HTML heading"""
        try:
            title = heading.get_text().strip()
            description = ""
            
            # Try to get description from next sibling
            next_sibling = heading.find_next_sibling()
            if next_sibling:
                description = next_sibling.get_text().strip()[:500]
            
            rule_type = self._determine_rule_type_from_content(title, description)
            
            rule = RegulatoryRule(
                rule_id=self._generate_rule_id_from_url(f"{url}#{title}"),
                rule_type=rule_type,
                title=title,
                description=description,
                effective_date=datetime.now(),
                source='cms_website',
                url=url,
                content=description,
                tags=self._extract_tags_from_content(title, description)
            )
            
            rule.hash = self._generate_content_hash(rule)
            
            return rule
            
        except Exception as e:
            logger.error(f"Error creating rule from heading: {str(e)}")
            return None

    def _generate_rule_id_from_url(self, url: str) -> str:
        """Generate rule ID from URL"""
        return hashlib.md5(url.encode()).hexdigest()[:12]

    def _generate_content_hash(self, rule: RegulatoryRule) -> str:
        """Generate content hash for change detection"""
        content = f"{rule.title}_{rule.description}_{rule.content}_{rule.effective_date}"
        return hashlib.sha256(content.encode()).hexdigest()

class RuleRepository:
    """Manages the JSON-based rule repository"""
    
    def __init__(self, repository_path: str = "data/regulatory_rules"):
        self.repository_path = Path(repository_path)
        self.repository_path.mkdir(parents=True, exist_ok=True)
        self.rules_file = self.repository_path / "rules.json"
        self.metadata_file = self.repository_path / "metadata.yaml"
        self.rules: Dict[str, RegulatoryRule] = {}
        self.load_rules()

    def load_rules(self) -> None:
        """Load rules from repository"""
        try:
            if self.rules_file.exists():
                with open(self.rules_file, 'r', encoding='utf-8') as f:
                    rules_data = json.load(f)
                
                for rule_id, rule_data in rules_data.items():
                    rule = self._dict_to_rule(rule_data)
                    self.rules[rule_id] = rule
                
                logger.info(f"Loaded {len(self.rules)} rules from repository")
            
        except Exception as e:
            logger.error(f"Error loading rules from repository: {str(e)}")

    def save_rules(self) -> None:
        """Save rules to repository"""
        try:
            rules_data = {}
            for rule_id, rule in self.rules.items():
                rules_data[rule_id] = self._rule_to_dict(rule)
            
            with open(self.rules_file, 'w', encoding='utf-8') as f:
                json.dump(rules_data, f, indent=2, default=str)
            
            # Save metadata
            metadata = {
                'last_updated': datetime.now().isoformat(),
                'total_rules': len(self.rules),
                'rule_types': self._get_rule_type_counts(),
                'active_rules': len([r for r in self.rules.values() if r.status == RuleStatus.ACTIVE])
            }
            
            with open(self.metadata_file, 'w', encoding='utf-8') as f:
                yaml.dump(metadata, f, default_flow_style=False)
            
            logger.info(f"Saved {len(self.rules)} rules to repository")
            
        except Exception as e:
            logger.error(f"Error saving rules to repository: {str(e)}")

    def add_rule(self, rule: RegulatoryRule) -> bool:
        """Add or update a rule"""
        try:
            # Check if rule already exists
            if rule.rule_id in self.rules:
                existing_rule = self.rules[rule.rule_id]
                
                # Check if content has changed
                if existing_rule.hash != rule.hash:
                    rule.version = self._increment_version(existing_rule.version)
                    rule.updated_at = datetime.now()
                    self.rules[rule.rule_id] = rule
                    logger.info(f"Updated rule {rule.rule_id}")
                    return True
                else:
                    logger.debug(f"Rule {rule.rule_id} unchanged, skipping")
                    return False
            else:
                self.rules[rule.rule_id] = rule
                logger.info(f"Added new rule {rule.rule_id}")
                return True
                
        except Exception as e:
            logger.error(f"Error adding rule {rule.rule_id}: {str(e)}")
            return False

    def get_rules_by_type(self, rule_type: RuleType) -> List[RegulatoryRule]:
        """Get rules by type"""
        return [rule for rule in self.rules.values() if rule.rule_type == rule_type]

    def get_active_rules(self) -> List[RegulatoryRule]:
        """Get all active rules"""
        return [rule for rule in self.rules.values() if rule.status == RuleStatus.ACTIVE]

    def search_rules(self, query: str) -> List[RegulatoryRule]:
        """Search rules by query"""
        query_lower = query.lower()
        matching_rules = []
        
        for rule in self.rules.values():
            if (query_lower in rule.title.lower() or 
                query_lower in rule.description.lower() or
                any(query_lower in tag.lower() for tag in rule.tags)):
                matching_rules.append(rule)
        
        return matching_rules

    def _dict_to_rule(self, data: Dict[str, Any]) -> RegulatoryRule:
        """Convert dictionary to RegulatoryRule"""
        return RegulatoryRule(
            rule_id=data['rule_id'],
            rule_type=RuleType(data['rule_type']),
            title=data['title'],
            description=data['description'],
            effective_date=datetime.fromisoformat(data['effective_date']),
            expiration_date=datetime.fromisoformat(data['expiration_date']) if data.get('expiration_date') else None,
            status=RuleStatus(data['status']),
            source=data['source'],
            url=data['url'],
            content=data['content'],
            tags=data['tags'],
            metadata=data['metadata'],
            created_at=datetime.fromisoformat(data['created_at']),
            updated_at=datetime.fromisoformat(data['updated_at']),
            version=data['version'],
            hash=data['hash']
        )

    def _rule_to_dict(self, rule: RegulatoryRule) -> Dict[str, Any]:
        """Convert RegulatoryRule to dictionary"""
        return {
            'rule_id': rule.rule_id,
            'rule_type': rule.rule_type.value,
            'title': rule.title,
            'description': rule.description,
            'effective_date': rule.effective_date.isoformat(),
            'expiration_date': rule.expiration_date.isoformat() if rule.expiration_date else None,
            'status': rule.status.value,
            'source': rule.source,
            'url': rule.url,
            'content': rule.content,
            'tags': rule.tags,
            'metadata': rule.metadata,
            'created_at': rule.created_at.isoformat(),
            'updated_at': rule.updated_at.isoformat(),
            'version': rule.version,
            'hash': rule.hash
        }

    def _increment_version(self, version: str) -> str:
        """Increment version number"""
        try:
            major, minor = version.split('.')
            return f"{major}.{int(minor) + 1}"
        except:
            return "1.1"

    def _get_rule_type_counts(self) -> Dict[str, int]:
        """Get counts by rule type"""
        counts = {}
        for rule in self.rules.values():
            rule_type = rule.rule_type.value
            counts[rule_type] = counts.get(rule_type, 0) + 1
        return counts

class RuleUpdater:
    """Main rule update orchestrator"""
    
    def __init__(self, repository_path: str = "data/regulatory_rules"):
        self.repository = RuleRepository(repository_path)
        self.cms_monitor = CMSAPIMonitor()
        self.web_scraper = CMSWebScraper()
        self.logger = logging.getLogger(__name__)

    async def update_rules(self) -> UpdateResult:
        """Main rule update function"""
        start_time = datetime.now()
        rules_updated = 0
        rules_added = 0
        rules_expired = 0
        errors = []
        
        self.logger.info("Starting rule update process")
        
        try:
            # 1. Check CMS API for updates
            self.logger.info("Checking CMS API for updates...")
            async with self.cms_monitor as monitor:
                api_rules = await monitor.check_for_updates()
                
                for rule in api_rules:
                    if self.repository.add_rule(rule):
                        rules_added += 1
            
            # 2. Scrape CMS website for updates
            self.logger.info("Scraping CMS website for updates...")
            async with self.web_scraper as scraper:
                web_rules = await scraper.scrape_for_updates()
                
                for rule in web_rules:
                    if self.repository.add_rule(rule):
                        rules_added += 1
            
            # 3. Check for expired rules
            self.logger.info("Checking for expired rules...")
            expired_count = self._check_expired_rules()
            rules_expired = expired_count
            
            # 4. Save updated repository
            self.repository.save_rules()
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            self.logger.info(f"Rule update completed. Added: {rules_added}, Expired: {rules_expired}, Time: {processing_time:.2f}s")
            
            return UpdateResult(
                success=True,
                rules_updated=rules_updated,
                rules_added=rules_added,
                rules_expired=rules_expired,
                errors=errors,
                processing_time=processing_time,
                last_update=datetime.now()
            )
            
        except Exception as e:
            error_msg = f"Error during rule update: {str(e)}"
            self.logger.error(error_msg)
            errors.append(error_msg)
            
            return UpdateResult(
                success=False,
                rules_updated=0,
                rules_added=0,
                rules_expired=0,
                errors=errors,
                processing_time=(datetime.now() - start_time).total_seconds(),
                last_update=datetime.now()
            )

    def _check_expired_rules(self) -> int:
        """Check for and mark expired rules"""
        expired_count = 0
        current_date = datetime.now()
        
        for rule in self.repository.rules.values():
            if (rule.expiration_date and 
                rule.expiration_date < current_date and 
                rule.status == RuleStatus.ACTIVE):
                
                rule.status = RuleStatus.EXPIRED
                rule.updated_at = current_date
                expired_count += 1
        
        return expired_count

    def get_rule_summary(self) -> Dict[str, Any]:
        """Get summary of current rules"""
        active_rules = self.repository.get_active_rules()
        
        summary = {
            'total_rules': len(self.repository.rules),
            'active_rules': len(active_rules),
            'rule_types': self.repository._get_rule_type_counts(),
            'last_update': self.repository.metadata_file.stat().st_mtime if self.repository.metadata_file.exists() else None,
            'recent_rules': [
                {
                    'id': rule.rule_id,
                    'title': rule.title,
                    'type': rule.rule_type.value,
                    'effective_date': rule.effective_date.isoformat(),
                    'source': rule.source
                }
                for rule in sorted(active_rules, key=lambda x: x.effective_date, reverse=True)[:10]
            ]
        }
        
        return summary

# Example usage and testing
if __name__ == "__main__":
    import asyncio
    
    async def test_rule_updater():
        updater = RuleUpdater()
        
        # Run rule update
        result = await updater.update_rules()
        
        print(f"Update Success: {result.success}")
        print(f"Rules Added: {result.rules_added}")
        print(f"Rules Expired: {result.rules_expired}")
        print(f"Processing Time: {result.processing_time:.2f} seconds")
        
        if result.errors:
            print("Errors:")
            for error in result.errors:
                print(f"  - {error}")
        
        # Get summary
        summary = updater.get_rule_summary()
        print(f"\nRule Summary:")
        print(f"Total Rules: {summary['total_rules']}")
        print(f"Active Rules: {summary['active_rules']}")
        print(f"Rule Types: {summary['rule_types']}")
    
    # Run the test
    asyncio.run(test_rule_updater())
