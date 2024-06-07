# We use the frontend container to build the frontend, and then copy the build into the backend container.
FROM node:20-alpine as frontendbuild
WORKDIR /app
COPY --from=frontend package.json .
RUN npm install
COPY  --from=frontend . .
ENV REACT_APP_BACKEND_URL ''
RUN npm run build
# Now we are done with the frontend.

# Use a base image with Python installed
FROM python:3.12-slim

# Set the working directory
WORKDIR /app

# Copy the tacheles_backend directory into the container
COPY . /app

# Install the required dependencies
COPY requirements.txt /app
RUN pip install -r requirements.txt

# Copy the frontend build into the container
COPY --from=frontendbuild /app/build /app/frontend

# Expose the port
EXPOSE 8001

# Tell the FastAPI app to host the frontend files
ENV HOST_FRONTEND_PATH=/app/frontend

# Set the command to run the FastAPI app
CMD ["uvicorn", "tacheles_backend.tacheles_backend:app", "--host", "0.0.0.0", "--port", "8001", "--log-level", "info"]
