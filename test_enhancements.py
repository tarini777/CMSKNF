#!/usr/bin/env python3
"""
Knowledge Nexus Framework™ - Enhancement Testing Script

This script tests all the new enhancements to ensure they work properly:
1. Data Aggregation and Quality Enhancements
2. Regulatory Intelligence Enhancements  
3. Process and System Enhancements
4. Resource and Operational Enhancements
"""

import asyncio
import aiohttp
import json
import pandas as pd
import io
from datetime import datetime
from typing import Dict, List, Any

class EnhancementTester:
    def __init__(self):
        self.base_urls = {
            'data_nexus': 'http://localhost:8007',
            'regulatory_intelligence': 'http://localhost:8006',
            'insights_engine': 'http://localhost:8003',
            'team_calibration': 'http://localhost:8002'
        }
        self.test_results = {}
        
    async def test_all_enhancements(self):
        """Run all enhancement tests"""
        print("🧪 Starting Knowledge Nexus Framework™ Enhancement Testing")
        print("=" * 60)
        
        # Test 1: Data Aggregation and Quality Enhancements
        await self.test_data_quality_enhancements()
        
        # Test 2: Regulatory Intelligence Enhancements
        await self.test_regulatory_intelligence_enhancements()
        
        # Test 3: Process and System Enhancements
        await self.test_workflow_enhancements()
        
        # Test 4: Resource and Operational Enhancements
        await self.test_knowledge_hub_enhancements()
        
        # Generate test report
        self.generate_test_report()
        
    async def test_data_quality_enhancements(self):
        """Test data aggregation and quality enhancements"""
        print("\n📊 Testing Data Aggregation and Quality Enhancements")
        print("-" * 50)
        
        async with aiohttp.ClientSession() as session:
            # Test 1: Health check
            try:
                async with session.get(f"{self.base_urls['data_nexus']}/health") as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ Data Nexus Health: {data['status']}")
                        self.test_results['data_nexus_health'] = True
                    else:
                        print(f"❌ Data Nexus Health: HTTP {response.status}")
                        self.test_results['data_nexus_health'] = False
            except Exception as e:
                print(f"❌ Data Nexus Health: {str(e)}")
                self.test_results['data_nexus_health'] = False
            
            # Test 2: Quality metrics endpoint
            try:
                async with session.get(f"{self.base_urls['data_nexus']}/data-cleaning/quality-metrics") as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ Quality Metrics: {data['metrics']['total_records_processed']} records processed")
                        self.test_results['quality_metrics'] = True
                    else:
                        print(f"⚠️  Quality Metrics: HTTP {response.status} (Expected - new endpoint)")
                        self.test_results['quality_metrics'] = False
            except Exception as e:
                print(f"⚠️  Quality Metrics: {str(e)} (Expected - new endpoint)")
                self.test_results['quality_metrics'] = False
            
            # Test 3: Existing data sources endpoint
            try:
                async with session.get(f"{self.base_urls['data_nexus']}/data-sources") as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ Data Sources: {len(data['data_sources'])} sources configured")
                        self.test_results['data_sources'] = True
                    else:
                        print(f"❌ Data Sources: HTTP {response.status}")
                        self.test_results['data_sources'] = False
            except Exception as e:
                print(f"❌ Data Sources: {str(e)}")
                self.test_results['data_sources'] = False
    
    async def test_regulatory_intelligence_enhancements(self):
        """Test regulatory intelligence enhancements"""
        print("\n📋 Testing Regulatory Intelligence Enhancements")
        print("-" * 50)
        
        async with aiohttp.ClientSession() as session:
            # Test 1: Health check
            try:
                async with session.get(f"{self.base_urls['regulatory_intelligence']}/health") as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ Regulatory Intelligence Health: {data['status']}")
                        self.test_results['regulatory_health'] = True
                    else:
                        print(f"❌ Regulatory Intelligence Health: HTTP {response.status}")
                        self.test_results['regulatory_health'] = False
            except Exception as e:
                print(f"❌ Regulatory Intelligence Health: {str(e)}")
                self.test_results['regulatory_health'] = False
            
            # Test 2: Rule updater endpoint
            try:
                async with session.get(f"{self.base_urls['regulatory_intelligence']}/rule-updater/rule-summary") as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ Rule Summary: {data['summary']['total_rules']} rules in repository")
                        self.test_results['rule_summary'] = True
                    else:
                        print(f"⚠️  Rule Summary: HTTP {response.status} (Expected - new endpoint)")
                        self.test_results['rule_summary'] = False
            except Exception as e:
                print(f"⚠️  Rule Summary: {str(e)} (Expected - new endpoint)")
                self.test_results['rule_summary'] = False
            
            # Test 3: Existing de minimis endpoint
            try:
                async with session.get(f"{self.base_urls['regulatory_intelligence']}/regulations/cms/de-minimis") as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ De Minimis Threshold: ${data.get('threshold', 'N/A')}")
                        self.test_results['de_minimis'] = True
                    else:
                        print(f"⚠️  De Minimis Threshold: HTTP {response.status} (No data yet)")
                        self.test_results['de_minimis'] = False
            except Exception as e:
                print(f"⚠️  De Minimis Threshold: {str(e)} (No data yet)")
                self.test_results['de_minimis'] = False
    
    async def test_workflow_enhancements(self):
        """Test workflow management enhancements"""
        print("\n🔄 Testing Process and System Enhancements")
        print("-" * 50)
        
        async with aiohttp.ClientSession() as session:
            # Test 1: Health check
            try:
                async with session.get(f"{self.base_urls['insights_engine']}/health") as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ Insights Engine Health: {data['status']}")
                        self.test_results['insights_health'] = True
                    else:
                        print(f"❌ Insights Engine Health: HTTP {response.status}")
                        self.test_results['insights_health'] = False
            except Exception as e:
                print(f"❌ Insights Engine Health: {str(e)}")
                self.test_results['insights_health'] = False
            
            # Test 2: Workflow creation endpoint
            try:
                workflow_data = {
                    "name": "Test Workflow",
                    "description": "Testing workflow creation",
                    "created_by": "test_user",
                    "workflow_template": "standard_cms_reporting"
                }
                async with session.post(f"{self.base_urls['insights_engine']}/workflow/create", 
                                      params=workflow_data) as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ Workflow Creation: {data.get('workflow_id', 'N/A')}")
                        self.test_results['workflow_creation'] = True
                    else:
                        print(f"⚠️  Workflow Creation: HTTP {response.status} (Expected - new endpoint)")
                        self.test_results['workflow_creation'] = False
            except Exception as e:
                print(f"⚠️  Workflow Creation: {str(e)} (Expected - new endpoint)")
                self.test_results['workflow_creation'] = False
            
            # Test 3: Existing insights dashboard
            try:
                async with session.get(f"{self.base_urls['insights_engine']}/dashboard/insights") as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ Insights Dashboard: Compliance score {data['compliance_score']}")
                        self.test_results['insights_dashboard'] = True
                    else:
                        print(f"❌ Insights Dashboard: HTTP {response.status}")
                        self.test_results['insights_dashboard'] = False
            except Exception as e:
                print(f"❌ Insights Dashboard: {str(e)}")
                self.test_results['insights_dashboard'] = False
    
    async def test_knowledge_hub_enhancements(self):
        """Test knowledge hub enhancements"""
        print("\n🎓 Testing Resource and Operational Enhancements")
        print("-" * 50)
        
        async with aiohttp.ClientSession() as session:
            # Test 1: Health check
            try:
                async with session.get(f"{self.base_urls['team_calibration']}/health") as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ Team Calibration Health: {data['status']}")
                        self.test_results['team_calibration_health'] = True
                    else:
                        print(f"❌ Team Calibration Health: HTTP {response.status}")
                        self.test_results['team_calibration_health'] = False
            except Exception as e:
                print(f"❌ Team Calibration Health: {str(e)}")
                self.test_results['team_calibration_health'] = False
            
            # Test 2: Knowledge hub training modules
            try:
                async with session.get(f"{self.base_urls['team_calibration']}/knowledge-hub/training-modules") as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ Training Modules: {data.get('total_modules', 0)} modules available")
                        self.test_results['training_modules'] = True
                    else:
                        print(f"⚠️  Training Modules: HTTP {response.status} (Expected - new endpoint)")
                        self.test_results['training_modules'] = False
            except Exception as e:
                print(f"⚠️  Training Modules: {str(e)} (Expected - new endpoint)")
                self.test_results['training_modules'] = False
            
            # Test 3: User initialization
            try:
                init_data = {
                    "user_id": "test_user_123",
                    "role": "data_analyst"
                }
                async with session.post(f"{self.base_urls['team_calibration']}/knowledge-hub/initialize-user",
                                      params=init_data) as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ User Initialization: {data.get('user_id', 'N/A')} initialized")
                        self.test_results['user_initialization'] = True
                    else:
                        print(f"⚠️  User Initialization: HTTP {response.status} (Expected - new endpoint)")
                        self.test_results['user_initialization'] = False
            except Exception as e:
                print(f"⚠️  User Initialization: {str(e)} (Expected - new endpoint)")
                self.test_results['user_initialization'] = False
    
    def generate_test_report(self):
        """Generate comprehensive test report"""
        print("\n" + "=" * 60)
        print("📋 ENHANCEMENT TESTING REPORT")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results.values() if result)
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        print("\n📊 Detailed Results:")
        for test_name, result in self.test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"  {test_name}: {status}")
        
        print("\n🔍 Analysis:")
        if failed_tests == 0:
            print("🎉 All tests passed! The platform is ready for production.")
        elif failed_tests <= 3:
            print("⚠️  Most tests passed. Some new endpoints may need service rebuild.")
        else:
            print("❌ Multiple test failures detected. Review and fix issues.")
        
        print(f"\n⏰ Test completed at: {datetime.now().isoformat()}")
        
        # Save results to file
        with open('test_results.json', 'w') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'total_tests': total_tests,
                'passed_tests': passed_tests,
                'failed_tests': failed_tests,
                'success_rate': (passed_tests/total_tests)*100,
                'detailed_results': self.test_results
            }, f, indent=2)
        
        print("💾 Test results saved to test_results.json")

async def main():
    """Main test execution"""
    tester = EnhancementTester()
    await tester.test_all_enhancements()

if __name__ == "__main__":
    asyncio.run(main())
