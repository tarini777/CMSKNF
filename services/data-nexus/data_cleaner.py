"""
Knowledge Nexus Framework™ - Data Cleaning and Standardization Module

This module performs robust data cleaning and standardization for incoming CSV data:
- Normalization: Standardize inconsistent data formats
- Deduplication: Implement fuzzy matching for duplicate records
- Data Contextualization: Use NLP to parse payment descriptions
"""

import re
import logging
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime
from difflib import SequenceMatcher
import unicodedata
from dataclasses import dataclass
from enum import Enum

# NLP imports
try:
    import spacy
    from spacy import displacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    logging.warning("spaCy not available. Install with: pip install spacy")

try:
    from fuzzywuzzy import fuzz, process
    FUZZYWUZZY_AVAILABLE = True
except ImportError:
    FUZZYWUZZY_AVAILABLE = False
    logging.warning("fuzzywuzzy not available. Install with: pip install fuzzywuzzy")

logger = logging.getLogger(__name__)

class DataQualityLevel(Enum):
    """Data quality assessment levels"""
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    CRITICAL = "critical"

@dataclass
class CleaningResult:
    """Result of data cleaning operation"""
    cleaned_data: pd.DataFrame
    quality_score: float
    quality_level: DataQualityLevel
    issues_found: List[str]
    duplicates_removed: int
    records_processed: int
    processing_time: float

@dataclass
class DuplicateRecord:
    """Information about duplicate records"""
    primary_id: str
    duplicate_ids: List[str]
    confidence_score: float
    merge_strategy: str

class DataNormalizer:
    """Handles data normalization and standardization"""
    
    def __init__(self):
        self.name_patterns = {
            'title_removal': re.compile(r'\b(Dr\.?|MD|PhD|DDS|DVM|RN|PA|NP)\b', re.IGNORECASE),
            'suffix_removal': re.compile(r'\b(Jr\.?|Sr\.?|III|IV|V)\b', re.IGNORECASE),
            'extra_spaces': re.compile(r'\s+'),
            'special_chars': re.compile(r'[^\w\s\-\.]')
        }
        
        self.address_patterns = {
            'street_abbrev': {
                'Street': 'St', 'Avenue': 'Ave', 'Road': 'Rd', 'Boulevard': 'Blvd',
                'Drive': 'Dr', 'Lane': 'Ln', 'Court': 'Ct', 'Place': 'Pl'
            },
            'state_abbrev': {
                'California': 'CA', 'New York': 'NY', 'Texas': 'TX', 'Florida': 'FL',
                'Illinois': 'IL', 'Pennsylvania': 'PA', 'Ohio': 'OH', 'Georgia': 'GA'
            }
        }
        
        self.date_formats = [
            '%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%Y-%m-%d %H:%M:%S',
            '%m-%d-%Y', '%d-%m-%Y', '%B %d, %Y', '%b %d, %Y'
        ]

    def normalize_name(self, name: str) -> str:
        """Normalize physician/recipient names"""
        if pd.isna(name) or not isinstance(name, str):
            return ""
        
        # Remove titles and suffixes
        normalized = self.name_patterns['title_removal'].sub('', name)
        normalized = self.name_patterns['suffix_removal'].sub('', normalized)
        
        # Clean up formatting
        normalized = self.name_patterns['extra_spaces'].sub(' ', normalized)
        normalized = self.name_patterns['special_chars'].sub('', normalized)
        
        # Title case
        normalized = normalized.strip().title()
        
        return normalized

    def normalize_address(self, address: str) -> str:
        """Normalize addresses"""
        if pd.isna(address) or not isinstance(address, str):
            return ""
        
        normalized = address.strip()
        
        # Standardize street abbreviations
        for full, abbrev in self.address_patterns['street_abbrev'].items():
            normalized = re.sub(rf'\b{full}\b', abbrev, normalized, flags=re.IGNORECASE)
        
        # Standardize state abbreviations
        for full, abbrev in self.address_patterns['state_abbrev'].items():
            normalized = re.sub(rf'\b{full}\b', abbrev, normalized, flags=re.IGNORECASE)
        
        return normalized.strip()

    def normalize_date(self, date_str: str) -> Optional[datetime]:
        """Normalize date formats"""
        if pd.isna(date_str):
            return None
        
        if isinstance(date_str, datetime):
            return date_str
        
        date_str = str(date_str).strip()
        
        for fmt in self.date_formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        
        logger.warning(f"Could not parse date: {date_str}")
        return None

    def normalize_phone(self, phone: str) -> str:
        """Normalize phone numbers"""
        if pd.isna(phone) or not isinstance(phone, str):
            return ""
        
        # Remove all non-digit characters
        digits = re.sub(r'\D', '', phone)
        
        # Format as (XXX) XXX-XXXX
        if len(digits) == 10:
            return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
        elif len(digits) == 11 and digits[0] == '1':
            return f"({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
        
        return phone

class DuplicateDetector:
    """Handles duplicate detection and fuzzy matching"""
    
    def __init__(self, similarity_threshold: float = 0.85):
        self.similarity_threshold = similarity_threshold
        self.fuzzy_available = FUZZYWUZZY_AVAILABLE

    def calculate_similarity(self, str1: str, str2: str) -> float:
        """Calculate similarity between two strings"""
        if not str1 or not str2:
            return 0.0
        
        if self.fuzzy_available:
            return fuzz.ratio(str1.lower(), str2.lower()) / 100.0
        else:
            return SequenceMatcher(None, str1.lower(), str2.lower()).ratio()

    def find_duplicates_by_name(self, df: pd.DataFrame, name_column: str = 'covered_recipient_name') -> List[DuplicateRecord]:
        """Find potential duplicates based on name similarity"""
        duplicates = []
        processed = set()
        
        for i, row1 in df.iterrows():
            if i in processed:
                continue
                
            name1 = str(row1.get(name_column, '')).strip()
            if not name1:
                continue
            
            similar_records = [i]
            
            for j, row2 in df.iterrows():
                if j <= i or j in processed:
                    continue
                
                name2 = str(row2.get(name_column, '')).strip()
                if not name2:
                    continue
                
                similarity = self.calculate_similarity(name1, name2)
                if similarity >= self.similarity_threshold:
                    similar_records.append(j)
            
            if len(similar_records) > 1:
                duplicate_record = DuplicateRecord(
                    primary_id=str(similar_records[0]),
                    duplicate_ids=[str(idx) for idx in similar_records[1:]],
                    confidence_score=similarity,
                    merge_strategy="name_similarity"
                )
                duplicates.append(duplicate_record)
                processed.update(similar_records)
        
        return duplicates

    def find_duplicates_by_multiple_fields(self, df: pd.DataFrame, 
                                         fields: List[str] = ['covered_recipient_name', 'npi', 'address']) -> List[DuplicateRecord]:
        """Find duplicates using multiple fields"""
        duplicates = []
        processed = set()
        
        for i, row1 in df.iterrows():
            if i in processed:
                continue
            
            similar_records = [i]
            total_similarity = 0.0
            field_count = 0
            
            for j, row2 in df.iterrows():
                if j <= i or j in processed:
                    continue
                
                field_similarities = []
                for field in fields:
                    val1 = str(row1.get(field, '')).strip()
                    val2 = str(row2.get(field, '')).strip()
                    
                    if val1 and val2:
                        similarity = self.calculate_similarity(val1, val2)
                        field_similarities.append(similarity)
                
                if field_similarities:
                    avg_similarity = sum(field_similarities) / len(field_similarities)
                    if avg_similarity >= self.similarity_threshold:
                        similar_records.append(j)
                        total_similarity += avg_similarity
                        field_count += 1
            
            if len(similar_records) > 1:
                confidence = total_similarity / field_count if field_count > 0 else 0.0
                duplicate_record = DuplicateRecord(
                    primary_id=str(similar_records[0]),
                    duplicate_ids=[str(idx) for idx in similar_records[1:]],
                    confidence_score=confidence,
                    merge_strategy="multi_field_similarity"
                )
                duplicates.append(duplicate_record)
                processed.update(similar_records)
        
        return duplicates

class PaymentDescriptionParser:
    """Uses NLP to parse payment descriptions and extract entities"""
    
    def __init__(self):
        self.nlp = None
        if SPACY_AVAILABLE:
            try:
                self.nlp = spacy.load("en_core_web_sm")
            except OSError:
                logger.warning("spaCy English model not found. Install with: python -m spacy download en_core_web_sm")
        
        # Standardized payment categories
        self.payment_categories = {
            'consulting': ['consulting', 'consultation', 'advisory', 'expert'],
            'speaking': ['speaking', 'presentation', 'lecture', 'talk'],
            'research': ['research', 'study', 'clinical trial', 'investigation'],
            'education': ['education', 'training', 'teaching', 'course'],
            'travel': ['travel', 'transportation', 'lodging', 'accommodation'],
            'food': ['food', 'meal', 'dining', 'catering'],
            'honoraria': ['honoraria', 'honorarium', 'fee', 'payment'],
            'grant': ['grant', 'funding', 'sponsorship', 'support']
        }

    def parse_payment_description(self, description: str) -> Dict[str, Any]:
        """Parse payment description and extract key entities"""
        if pd.isna(description) or not isinstance(description, str):
            return {
                'category': 'unknown',
                'entities': [],
                'confidence': 0.0,
                'keywords': []
            }
        
        description_lower = description.lower()
        
        # Extract category
        category = self._extract_category(description_lower)
        
        # Extract entities using spaCy if available
        entities = []
        if self.nlp:
            doc = self.nlp(description)
            entities = [
                {
                    'text': ent.text,
                    'label': ent.label_,
                    'start': ent.start_char,
                    'end': ent.end_char
                }
                for ent in doc.ents
            ]
        
        # Extract keywords
        keywords = self._extract_keywords(description_lower)
        
        return {
            'category': category,
            'entities': entities,
            'confidence': self._calculate_confidence(description_lower, category),
            'keywords': keywords
        }

    def _extract_category(self, description: str) -> str:
        """Extract payment category from description"""
        category_scores = {}
        
        for category, keywords in self.payment_categories.items():
            score = sum(1 for keyword in keywords if keyword in description)
            if score > 0:
                category_scores[category] = score
        
        if category_scores:
            return max(category_scores, key=category_scores.get)
        
        return 'unknown'

    def _extract_keywords(self, description: str) -> List[str]:
        """Extract relevant keywords from description"""
        keywords = []
        for category, category_keywords in self.payment_categories.items():
            for keyword in category_keywords:
                if keyword in description:
                    keywords.append(keyword)
        
        return list(set(keywords))

    def _calculate_confidence(self, description: str, category: str) -> float:
        """Calculate confidence score for category extraction"""
        if category == 'unknown':
            return 0.0
        
        category_keywords = self.payment_categories.get(category, [])
        matches = sum(1 for keyword in category_keywords if keyword in description)
        
        return min(matches / len(category_keywords), 1.0) if category_keywords else 0.0

class DataCleaner:
    """Main data cleaning orchestrator"""
    
    def __init__(self):
        self.normalizer = DataNormalizer()
        self.duplicate_detector = DuplicateDetector()
        self.parser = PaymentDescriptionParser()
        self.logger = logging.getLogger(__name__)

    def clean_data(self, df: pd.DataFrame, 
                   name_column: str = 'covered_recipient_name',
                   address_column: str = 'address',
                   date_column: str = 'date_of_payment',
                   phone_column: str = 'phone',
                   description_column: str = 'payment_description') -> CleaningResult:
        """Main data cleaning function"""
        
        start_time = datetime.now()
        original_count = len(df)
        issues_found = []
        
        self.logger.info(f"Starting data cleaning for {original_count} records")
        
        # Create a copy to avoid modifying original
        cleaned_df = df.copy()
        
        # 1. Normalize data
        self.logger.info("Normalizing data...")
        if name_column in cleaned_df.columns:
            cleaned_df[name_column] = cleaned_df[name_column].apply(self.normalizer.normalize_name)
        
        if address_column in cleaned_df.columns:
            cleaned_df[address_column] = cleaned_df[address_column].apply(self.normalizer.normalize_address)
        
        if date_column in cleaned_df.columns:
            cleaned_df[date_column] = cleaned_df[date_column].apply(self.normalizer.normalize_date)
        
        if phone_column in cleaned_df.columns:
            cleaned_df[phone_column] = cleaned_df[phone_column].apply(self.normalizer.normalize_phone)
        
        # 2. Parse payment descriptions
        if description_column in cleaned_df.columns:
            self.logger.info("Parsing payment descriptions...")
            parsed_descriptions = cleaned_df[description_column].apply(self.parser.parse_payment_description)
            
            # Add parsed data as new columns
            cleaned_df['payment_category'] = parsed_descriptions.apply(lambda x: x['category'])
            cleaned_df['payment_confidence'] = parsed_descriptions.apply(lambda x: x['confidence'])
            cleaned_df['payment_keywords'] = parsed_descriptions.apply(lambda x: x['keywords'])
        
        # 3. Detect and handle duplicates
        self.logger.info("Detecting duplicates...")
        duplicates = self.duplicate_detector.find_duplicates_by_multiple_fields(
            cleaned_df, [name_column, 'npi', address_column]
        )
        
        duplicates_removed = 0
        for duplicate in duplicates:
            # Keep the first record, remove others
            duplicate_indices = [int(did) for did in duplicate.duplicate_ids]
            cleaned_df = cleaned_df.drop(duplicate_indices)
            duplicates_removed += len(duplicate_indices)
            issues_found.append(f"Removed {len(duplicate_indices)} duplicate records (confidence: {duplicate.confidence_score:.2f})")
        
        # 4. Quality assessment
        quality_score = self._assess_data_quality(cleaned_df)
        quality_level = self._get_quality_level(quality_score)
        
        # 5. Final validation
        final_issues = self._validate_cleaned_data(cleaned_df)
        issues_found.extend(final_issues)
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        self.logger.info(f"Data cleaning completed. Processed {original_count} records, "
                        f"removed {duplicates_removed} duplicates, "
                        f"final count: {len(cleaned_df)}")
        
        return CleaningResult(
            cleaned_data=cleaned_df,
            quality_score=quality_score,
            quality_level=quality_level,
            issues_found=issues_found,
            duplicates_removed=duplicates_removed,
            records_processed=original_count,
            processing_time=processing_time
        )

    def _assess_data_quality(self, df: pd.DataFrame) -> float:
        """Assess overall data quality score"""
        if df.empty:
            return 0.0
        
        total_cells = len(df) * len(df.columns)
        missing_cells = df.isnull().sum().sum()
        completeness = 1.0 - (missing_cells / total_cells)
        
        # Additional quality factors
        duplicate_score = 1.0 - (df.duplicated().sum() / len(df))
        
        # Combine scores
        quality_score = (completeness * 0.7 + duplicate_score * 0.3)
        
        return min(max(quality_score, 0.0), 1.0)

    def _get_quality_level(self, score: float) -> DataQualityLevel:
        """Convert quality score to quality level"""
        if score >= 0.9:
            return DataQualityLevel.EXCELLENT
        elif score >= 0.8:
            return DataQualityLevel.GOOD
        elif score >= 0.7:
            return DataQualityLevel.FAIR
        elif score >= 0.6:
            return DataQualityLevel.POOR
        else:
            return DataQualityLevel.CRITICAL

    def _validate_cleaned_data(self, df: pd.DataFrame) -> List[str]:
        """Validate cleaned data and return issues"""
        issues = []
        
        # Check for required columns
        required_columns = ['covered_recipient_name', 'payment_amount', 'date_of_payment']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            issues.append(f"Missing required columns: {missing_columns}")
        
        # Check for empty data
        if df.empty:
            issues.append("Dataset is empty after cleaning")
        
        # Check for negative payment amounts
        if 'payment_amount' in df.columns:
            negative_amounts = (df['payment_amount'] < 0).sum()
            if negative_amounts > 0:
                issues.append(f"Found {negative_amounts} records with negative payment amounts")
        
        return issues

# Example usage and testing
if __name__ == "__main__":
    # Sample data for testing
    sample_data = {
        'covered_recipient_name': [
            'Dr. John Smith, MD',
            'Jane Doe, PhD',
            'Dr. Smith John',
            'Robert Johnson Jr.',
            'Mary Wilson, RN'
        ],
        'payment_amount': [1000, 500, 1200, 750, 300],
        'date_of_payment': ['2024-01-15', '01/15/2024', '15-01-2024', 'January 15, 2024', '2024-01-15'],
        'payment_description': [
            'Consulting services for clinical trial design',
            'Speaking engagement at medical conference',
            'Research collaboration on new drug development',
            'Educational training session',
            'Travel reimbursement for conference attendance'
        ],
        'address': [
            '123 Main Street, New York, NY',
            '456 Oak Avenue, California',
            '789 Pine Road, TX',
            '321 Elm Boulevard, Florida',
            '654 Maple Drive, IL'
        ]
    }
    
    df = pd.DataFrame(sample_data)
    
    # Initialize cleaner
    cleaner = DataCleaner()
    
    # Clean the data
    result = cleaner.clean_data(df)
    
    print(f"Quality Score: {result.quality_score:.2f}")
    print(f"Quality Level: {result.quality_level.value}")
    print(f"Duplicates Removed: {result.duplicates_removed}")
    print(f"Processing Time: {result.processing_time:.2f} seconds")
    print(f"Issues Found: {len(result.issues_found)}")
    
    for issue in result.issues_found:
        print(f"  - {issue}")
    
    print("\nCleaned Data:")
    print(result.cleaned_data.head())
