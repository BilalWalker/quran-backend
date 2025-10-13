// utils/response.js
class ApiResponse {
  static success(data = null, message = 'Success', statusCode = 200) {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      statusCode
    };
  }

  static error(message = 'Error', statusCode = 500, details = null) {
    const response = {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      statusCode
    };

    if (details && process.env.NODE_ENV !== 'production') {
      response.details = details;
    }

    return response;
  }

  static paginated(data, pagination, message = 'Success') {
    return {
      success: true,
      message,
      data,
      pagination,
      timestamp: new Date().toISOString()
    };
  }

  static validation(errors) {
    return {
      success: false,
      error: 'Validation failed',
      details: errors,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = ApiResponse;
