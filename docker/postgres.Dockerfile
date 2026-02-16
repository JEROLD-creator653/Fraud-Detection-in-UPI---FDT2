FROM postgres:14-alpine

# Set environment variables
ENV POSTGRES_DB=fdt_db
ENV POSTGRES_USER=fdt
ENV POSTGRES_HOST_AUTH_METHOD=trust

# Copy initialization script
COPY backend/init_schema.sql /docker-entrypoint-initdb.d/

EXPOSE 5432
