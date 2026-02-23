import requests
import sys
import io
from datetime import datetime

class CloudVaultTester:
    def __init__(self, base_url="https://backup-vault-4.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.uploaded_files = []

    def log(self, message, status="INFO"):
        print(f"[{status}] {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if files is None and data is not None:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                if files:
                    response = requests.post(url, headers={k: v for k, v in headers.items() if k != 'Content-Type'}, files=files, data=data)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}", "PASS")
                return True, response.json() if response.content and response.headers.get('content-type', '').startswith('application/json') else response.content
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}", "FAIL")
                if response.content:
                    self.log(f"Response: {response.text}", "ERROR")
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}", "ERROR")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        return success

    def test_register(self, email, password):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={"email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            self.log(f"Registered user: {email} with ID: {self.user_id}")
            return True
        return False

    def test_login(self, email, password):
        """Test user login"""
        success, response = self.run_test(
            "User Login", 
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            self.log(f"Logged in user: {email}")
            return True
        return False

    def test_file_upload(self, filename, content):
        """Test file upload"""
        file_content = content.encode() if isinstance(content, str) else content
        files = {'file': (filename, io.BytesIO(file_content), 'text/plain')}
        
        success, response = self.run_test(
            f"File Upload - {filename}",
            "POST",
            "files/upload",
            200,
            files=files
        )
        if success and 'id' in response:
            file_info = {
                'id': response['id'],
                'filename': filename,
                'version_id': response.get('version_id')
            }
            self.uploaded_files.append(file_info)
            self.log(f"Uploaded file: {filename} with ID: {response['id']}")
            return file_info
        return None

    def test_list_files(self):
        """Test listing user files"""
        success, response = self.run_test(
            "List Files",
            "GET",
            "files",
            200
        )
        if success:
            self.log(f"Found {len(response)} files")
            return response
        return []

    def test_file_versions(self, file_id):
        """Test getting file versions"""
        success, response = self.run_test(
            f"File Versions - {file_id}",
            "GET",
            f"files/{file_id}/versions",
            200
        )
        if success:
            self.log(f"Found {len(response)} versions for file {file_id}")
            return response
        return []

    def test_file_download(self, file_id, version_id=None):
        """Test file download"""
        endpoint = f"files/{file_id}/download"
        params = {}
        if version_id:
            params['version_id'] = version_id
            
        success, response = self.run_test(
            f"File Download - {file_id}" + (f" (v{version_id})" if version_id else ""),
            "GET",
            endpoint,
            200,
            params=params
        )
        if success:
            self.log(f"Downloaded file {file_id} successfully")
            return True
        return False

    def test_file_restore(self, file_id, version_id):
        """Test file version restore"""
        success, response = self.run_test(
            f"File Restore - {file_id} to version {version_id}",
            "POST", 
            f"files/{file_id}/restore",
            200,
            params={'version_id': version_id}
        )
        if success:
            self.log(f"Restored file {file_id} to version {version_id}")
            return response
        return None

    def test_authentication_required(self):
        """Test that protected endpoints require authentication"""
        original_token = self.token
        self.token = None
        
        success, _ = self.run_test(
            "Protected Endpoint (No Auth)",
            "GET",
            "files",
            401
        )
        
        self.token = original_token
        return success

    def run_comprehensive_test(self):
        """Run all tests in sequence"""
        self.log("=" * 60)
        self.log("STARTING CLOUDVAULT API COMPREHENSIVE TEST")
        self.log("=" * 60)
        
        # Test 1: Health check
        if not self.test_health_check():
            self.log("Health check failed - stopping tests", "ERROR")
            return self.get_results()

        # Test 2: User registration
        test_email = f"testuser_{datetime.now().strftime('%H%M%S')}@example.com"
        test_password = "SecurePass123!"
        
        if not self.test_register(test_email, test_password):
            self.log("Registration failed - stopping tests", "ERROR")
            return self.get_results()

        # Test 3: Authentication required check
        self.test_authentication_required()

        # Test 4: File upload (multiple files for versioning)
        test_files = [
            ("test_document.txt", "This is the first version of the document."),
            ("config.json", '{"app": "cloudvault", "version": "1.0"}'),
            ("data.csv", "name,age,city\nJohn,25,NYC\nJane,30,LA")
        ]
        
        uploaded_file = None
        for filename, content in test_files:
            file_info = self.test_file_upload(filename, content)
            if filename == "test_document.txt":
                uploaded_file = file_info

        # Test 5: List files
        files_list = self.test_list_files()

        # Test 6: Upload new version of the same file
        if uploaded_file:
            self.log(f"Uploading new version of {uploaded_file['filename']}")
            new_version = self.test_file_upload(uploaded_file['filename'], "This is the UPDATED version of the document with more content!")

        # Test 7: Get file versions
        versions = []
        if uploaded_file:
            versions = self.test_file_versions(uploaded_file['id'])

        # Test 8: Download specific version
        if uploaded_file and versions:
            for version in versions[:2]:  # Test first 2 versions
                self.test_file_download(uploaded_file['id'], version['version_id'])

        # Test 9: Download latest version
        if uploaded_file:
            self.test_file_download(uploaded_file['id'])

        # Test 10: Restore previous version
        if uploaded_file and len(versions) > 1:
            old_version = versions[-1]  # Get oldest version
            self.test_file_restore(uploaded_file['id'], old_version['version_id'])

        # Test 11: Verify version after restore
        if uploaded_file:
            updated_versions = self.test_file_versions(uploaded_file['id'])
            if len(updated_versions) > len(versions):
                self.log("✅ Version restore created new version as expected")
            else:
                self.log("❌ Version restore did not create new version")

        return self.get_results()

    def get_results(self):
        """Get test results summary"""
        self.log("=" * 60)
        self.log("TEST RESULTS SUMMARY")
        self.log("=" * 60)
        self.log(f"Tests Run: {self.tests_run}")
        self.log(f"Tests Passed: {self.tests_passed}")
        self.log(f"Tests Failed: {self.tests_run - self.tests_passed}")
        self.log(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        return {
            "tests_run": self.tests_run,
            "tests_passed": self.tests_passed,
            "success_rate": (self.tests_passed/self.tests_run*100) if self.tests_run > 0 else 0,
            "uploaded_files": self.uploaded_files
        }

def main():
    tester = CloudVaultTester()
    results = tester.run_comprehensive_test()
    
    # Return appropriate exit code
    return 0 if results["success_rate"] >= 80 else 1

if __name__ == "__main__":
    sys.exit(main())