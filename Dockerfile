# ============================================
# FindRepo — GitHub Repository Explorer
# Lightweight container using nginx-alpine
# ============================================

FROM nginx:1.29-alpine

# Metadata labels (OCI standard)
LABEL maintainer="FindRepo Team"
LABEL org.opencontainers.image.title="FindRepo"
LABEL org.opencontainers.image.description="Search, explore, and discover repositories within any GitHub organization"
LABEL org.opencontainers.image.url="https://github.com/findrepo/FindRepo"
LABEL org.opencontainers.image.source="https://github.com/findrepo/FindRepo"
LABEL org.opencontainers.image.licenses="MIT"

# Remove default nginx configuration
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static application files
COPY index.html /usr/share/nginx/html/index.html
COPY style.css /usr/share/nginx/html/style.css
COPY app.js /usr/share/nginx/html/app.js

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check — verify nginx is serving content
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
