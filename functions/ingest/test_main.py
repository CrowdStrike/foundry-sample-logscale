"""Test module for the ingest function handler."""

import importlib
import unittest
from io import BytesIO
from unittest.mock import patch, MagicMock

from crowdstrike.foundry.function import Request

import main


def mock_handler(*_args, **_kwargs):
    """Mock handler decorator for testing."""

    def identity(func):
        return func

    return identity


class FnTestCase(unittest.TestCase):
    """Test case class for function handler tests."""

    def setUp(self):
        """Set up test fixtures before each test method."""
        patcher = patch("crowdstrike.foundry.function.Function.handler", new=mock_handler)
        self.addCleanup(patcher.stop)
        self.handler_patch = patcher.start()

        importlib.reload(main)

    @patch('main.FoundryLogScale')
    def test_on_create_success_service_class(self, mock_logscale_class):
        """Test successful POST request using FoundryLogScale service class."""
        # Mock FoundryLogScale instance
        mock_logscale_instance = MagicMock()
        mock_logscale_class.return_value = mock_logscale_instance

        # Mock successful ingest_data response
        mock_logscale_instance.ingest_data.return_value = {
            "status_code": 200,
            "body": {"success": True, "message": "Data ingested successfully"}
        }

        # Create request with valid data
        request = Request()
        request.body = {
            "data": {"event": "test_event", "timestamp": 1234567890}
        }

        # Mock config without use_uber_class (defaults to service class)
        config = {}
        logger = MagicMock()

        response = main.on_create(request, config, logger)

        # Assertions
        self.assertEqual(response.code, 200)
        self.assertEqual(response.body, {"success": True, "message": "Data ingested successfully"})

        # Verify FoundryLogScale was instantiated and called
        mock_logscale_class.assert_called_once()
        mock_logscale_instance.ingest_data.assert_called_once()

        # Verify the data_file argument is a BytesIO object
        call_kwargs = mock_logscale_instance.ingest_data.call_args[1]
        self.assertIsInstance(call_kwargs['data_file'], BytesIO)

    @patch('main.APIHarnessV2')
    def test_on_create_success_uber_class(self, mock_api_harness_class):
        """Test successful POST request using APIHarnessV2 uber class."""
        # Mock APIHarnessV2 instance
        mock_api_instance = MagicMock()
        mock_api_harness_class.return_value = mock_api_instance

        # Mock successful command response
        mock_api_instance.command.return_value = {
            "status_code": 201,
            "body": {"success": True, "message": "Data ingested via uber class"}
        }

        # Create request with valid data
        request = Request()
        request.body = {
            "data": {"event": "test_event", "value": 42}
        }

        # Mock config with use_uber_class set to True
        config = {"use_uber_class": True}
        logger = MagicMock()

        response = main.on_create(request, config, logger)

        # Assertions
        self.assertEqual(response.code, 201)
        self.assertEqual(response.body, {"success": True, "message": "Data ingested via uber class"})

        # Verify APIHarnessV2 was instantiated and called
        mock_api_harness_class.assert_called_once()
        mock_api_instance.command.assert_called_once_with(
            "IngestDataV1",
            files=[("data_file", ("data_file", b'{"event": "test_event", "value": 42}', "application/json"))]
        )

    def test_on_create_missing_data(self):
        """Test POST request with missing data returns 400 error."""
        request = Request()
        request.body = {}

        config = {}
        logger = MagicMock()

        response = main.on_create(request, config, logger)

        # Assertions
        self.assertEqual(response.code, 400)
        self.assertEqual(len(response.errors), 1)
        self.assertEqual(response.errors[0].message, "missing data from request body")

        # Verify error was logged
        logger.error.assert_called_once_with("No data received in request")

    def test_on_create_none_data(self):
        """Test POST request with None data returns 400 error."""
        request = Request()
        request.body = {"data": None}

        config = {}
        logger = MagicMock()

        response = main.on_create(request, config, logger)

        # Assertions
        self.assertEqual(response.code, 400)
        self.assertEqual(len(response.errors), 1)
        self.assertEqual(response.errors[0].message, "missing data from request body")

    def test_on_create_empty_data(self):
        """Test POST request with empty string data returns 400 error."""
        request = Request()
        request.body = {"data": ""}

        config = {}
        logger = MagicMock()

        response = main.on_create(request, config, logger)

        # Assertions
        self.assertEqual(response.code, 400)
        self.assertEqual(len(response.errors), 1)
        self.assertEqual(response.errors[0].message, "missing data from request body")

    @patch('main.dumps')
    def test_on_create_invalid_json_data(self, mock_dumps):
        """Test POST request with non-serializable data returns 400 error."""
        # Mock dumps to raise TypeError
        mock_dumps.side_effect = TypeError("Object of type 'set' is not JSON serializable")

        request = Request()
        request.body = {
            "data": {"invalid": set([1, 2, 3])}  # Sets are not JSON serializable
        }

        config = {}
        logger = MagicMock()

        response = main.on_create(request, config, logger)

        # Assertions
        self.assertEqual(response.code, 400)
        self.assertEqual(len(response.errors), 1)
        self.assertEqual(response.errors[0].message, "invalid data in request body")

        # Verify error was logged
        logger.error.assert_called_once()
        self.assertIn("Invalid data provided", logger.error.call_args[0][0])

    @patch('main.FoundryLogScale')
    def test_on_create_api_error_response(self, mock_logscale_class):
        """Test handling of API error response from FoundryLogScale."""
        # Mock FoundryLogScale instance
        mock_logscale_instance = MagicMock()
        mock_logscale_class.return_value = mock_logscale_instance

        # Mock error response from API
        mock_logscale_instance.ingest_data.return_value = {
            "status_code": 500,
            "body": {"error": "Internal server error"}
        }

        request = Request()
        request.body = {
            "data": {"event": "test_event"}
        }

        config = {}
        logger = MagicMock()

        response = main.on_create(request, config, logger)

        # Assertions
        self.assertEqual(response.code, 500)
        self.assertEqual(response.body, {"error": "Internal server error"})

    @patch('main.APIHarnessV2')
    def test_on_create_uber_class_error_response(self, mock_api_harness_class):
        """Test handling of API error response from APIHarnessV2."""
        # Mock APIHarnessV2 instance
        mock_api_instance = MagicMock()
        mock_api_harness_class.return_value = mock_api_instance

        # Mock error response from API
        mock_api_instance.command.return_value = {
            "status_code": 403,
            "body": {"error": "Forbidden"}
        }

        request = Request()
        request.body = {
            "data": {"event": "test_event"}
        }

        config = {"use_uber_class": True}
        logger = MagicMock()

        response = main.on_create(request, config, logger)

        # Assertions
        self.assertEqual(response.code, 403)
        self.assertEqual(response.body, {"error": "Forbidden"})

    @patch('main.FoundryLogScale')
    def test_on_create_with_complex_data(self, mock_logscale_class):
        """Test POST request with complex nested data structure."""
        # Mock FoundryLogScale instance
        mock_logscale_instance = MagicMock()
        mock_logscale_class.return_value = mock_logscale_instance

        mock_logscale_instance.ingest_data.return_value = {
            "status_code": 200,
            "body": {"success": True}
        }

        # Create request with complex nested data
        request = Request()
        request.body = {
            "data": {
                "event": "complex_event",
                "nested": {
                    "level1": {
                        "level2": ["array", "of", "values"]
                    }
                },
                "numbers": [1, 2, 3, 4, 5],
                "boolean": True,
                "null_value": None
            }
        }

        config = {}
        logger = MagicMock()

        response = main.on_create(request, config, logger)

        # Assertions
        self.assertEqual(response.code, 200)
        mock_logscale_instance.ingest_data.assert_called_once()

    @patch('main.FoundryLogScale')
    def test_on_create_with_none_config(self, mock_logscale_class):
        """Test POST request with None config defaults to service class."""
        # Mock FoundryLogScale instance
        mock_logscale_instance = MagicMock()
        mock_logscale_class.return_value = mock_logscale_instance

        mock_logscale_instance.ingest_data.return_value = {
            "status_code": 200,
            "body": {"success": True}
        }

        request = Request()
        request.body = {
            "data": {"event": "test_event"}
        }

        config = None
        logger = MagicMock()

        response = main.on_create(request, config, logger)

        # Assertions
        self.assertEqual(response.code, 200)
        mock_logscale_class.assert_called_once()

    @patch('main.APIHarnessV2')
    def test_on_create_uber_class_with_false_value(self, mock_api_harness_class):
        """Test that use_uber_class=False uses service class, not uber class."""
        # This test ensures APIHarnessV2 is NOT called when use_uber_class is False
        request = Request()
        request.body = {
            "data": {"event": "test_event"}
        }

        config = {"use_uber_class": False}
        logger = MagicMock()

        # We need to also mock FoundryLogScale since it will be used instead
        with patch('main.FoundryLogScale') as mock_logscale_class:
            mock_logscale_instance = MagicMock()
            mock_logscale_class.return_value = mock_logscale_instance
            mock_logscale_instance.ingest_data.return_value = {
                "status_code": 200,
                "body": {"success": True}
            }

            response = main.on_create(request, config, logger)

            # Assertions
            self.assertEqual(response.code, 200)
            mock_api_harness_class.assert_not_called()
            mock_logscale_class.assert_called_once()

    @patch('main.FoundryLogScale')
    def test_on_create_logging_service_class(self, mock_logscale_class):
        """Test that appropriate log messages are generated for service class."""
        mock_logscale_instance = MagicMock()
        mock_logscale_class.return_value = mock_logscale_instance
        mock_logscale_instance.ingest_data.return_value = {
            "status_code": 200,
            "body": {"success": True}
        }

        request = Request()
        request.body = {
            "data": {"event": "test_event"}
        }

        config = {}
        logger = MagicMock()

        main.on_create(request, config, logger)

        # Verify the correct log message was generated
        logger.info.assert_called_once_with("Using FalconPy FoundryLogScale (Service Class)")

    @patch('main.APIHarnessV2')
    def test_on_create_logging_uber_class(self, mock_api_harness_class):
        """Test that appropriate log messages are generated for uber class."""
        mock_api_instance = MagicMock()
        mock_api_harness_class.return_value = mock_api_instance
        mock_api_instance.command.return_value = {
            "status_code": 200,
            "body": {"success": True}
        }

        request = Request()
        request.body = {
            "data": {"event": "test_event"}
        }

        config = {"use_uber_class": True}
        logger = MagicMock()

        main.on_create(request, config, logger)

        # Verify the correct log message was generated
        logger.info.assert_called_once_with("Using FalconPy APIHarnessV2 (Uber Class)")


if __name__ == "__main__":
    unittest.main()
