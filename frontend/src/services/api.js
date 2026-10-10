import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(
      "tableflow_token"
    );

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Let the browser set the correct
    // multipart/form-data boundary for FormData.
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    } else {
      config.headers["Content-Type"] =
        "application/json";
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;