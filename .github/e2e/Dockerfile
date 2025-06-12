FROM node:20-alpine
WORKDIR /work
RUN npm config set registry http://host.docker.internal:4873
RUN apk add --no-cache bash git curl

# Create a mock git user for any git operations
RUN git config --global user.email "test@example.com"
RUN git config --global user.name "Test User"

# Copy test files
COPY ./e2e-run.sh .
COPY ./tests ./tests

# Create a local template directory to avoid GitHub access issues
RUN mkdir -p /work/local-template

ENTRYPOINT ["bash", "e2e-run.sh"]