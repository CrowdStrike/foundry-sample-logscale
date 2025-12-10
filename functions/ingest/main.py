"""Demonstrates ingesting data to Foundry LogScale repo"""
from io import BytesIO
from json import dumps
from logging import Logger
from crowdstrike.foundry.function import APIError, Function, Request, Response
from falconpy import FoundryLogScale, APIHarnessV2


FUNC = Function.instance()


@FUNC.handler(method="POST", path="/ingest")
def on_create(request: Request, config: dict, logger: Logger) -> Response:
    """Write data into LogScale."""

    # Fetch the data to write from input payload
    data = request.body.get("data")
    if not data:
        logger.error("No data received in request")
        return Response(
            code=400,
            errors=[APIError(code=400, message="missing data from request body")]
        )

    # Convert the json input to binary for writing to LogScale
    try:
        json_binary = dumps(data).encode(encoding="utf-8")
    except TypeError as ex:
        logger.error("Invalid data provided in request body: %s", ex)
        return Response(
            code=400,
            errors=[APIError(code=400, message="invalid data in request body")]
        )

    # Based on config, determine which FalconPy class to use
    if config and config.get("use_uber_class"):
        logger.info("Using FalconPy APIHarnessV2 (Uber Class)")
        file_tuple = [("data_file", ("data_file", json_binary, "application/json"))]
        api_client = APIHarnessV2()
        result = api_client.command(
            "IngestDataV1",
            files=file_tuple
        )
    else:
        logger.info("Using FalconPy FoundryLogScale (Service Class)")
        json_file = BytesIO(json_binary)
        api_client = FoundryLogScale()
        result = api_client.ingest_data(
            data_file=json_file,
        )

    return Response(
        code=result["status_code"],
        body=result["body"]
    )


if __name__ == "__main__":
    FUNC.run()
