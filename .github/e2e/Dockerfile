FROM node:20-alpine
WORKDIR /work
RUN npm config set registry http://host.docker.internal:4873
RUN apk add --no-cache bash git
COPY ./e2e-run.sh .
COPY ./tests ./tests
ENTRYPOINT ["bash", "e2e-run.sh"]