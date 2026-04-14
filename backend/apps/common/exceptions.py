from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response

    data = response.data
    if isinstance(data, dict):
        if "detail" in data:
            response.data = {"message": str(data.get("detail")), "errors": data}
        else:
            response.data = {"message": "Validation failed.", "errors": data}
    elif isinstance(data, list):
        response.data = {"message": "Validation failed.", "errors": {"non_field_errors": data}}
    else:
        response.data = {"message": "Request failed.", "errors": {"non_field_errors": [str(data)]}}
    return response
