<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## MongoDB

The application uses MongoDB configured by `MONGODB_URI`. Start the application
and MongoDB together from the repository root with:

```bash
docker compose up --build
```

Compose waits for MongoDB's health check before starting the backend, which
connects to the `db` service at `mongodb://db:27017/jsm-product`. When running
the backend outside Docker, set `MONGODB_URI` to your MongoDB connection
string. The backend validates this variable at startup.

## Environment variables

`ConfigModule` loads `backend/.env.stage.dev` for development and test, and
`backend/.env.stage.prod` in production. Set `NODE_ENV` to `development`,
`test`, or `production` to select the runtime environment. Variables set
directly in the process environment take precedence over file values. Keep
secrets out of source control.

On PowerShell, start development with:

```powershell
$env:NODE_ENV = 'development'
npm run start:dev
```

Configure `MONGODB_URI`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` in the
selected environment file or deployment environment. JWT secrets must each be
at least 32 characters. `JWT_ACCESS_TTL_SECONDS` and
`JWT_REFRESH_TTL_SECONDS` default to 900 and 604800 seconds. In production, set `NODE_ENV=production` and provide secrets through the
deployment environment.

Password reset mail uses the `MAIL_PROVIDER` adapter boundary. Development
defaults to Nodemailer; without `SMTP_HOST`, it creates an Ethereal test
account and logs a browser preview URL when an email is sent. Configure
`SMTP_HOST`, `SMTP_PORT` (defaults to 587), `SMTP_USER`, `SMTP_PASS`, and
`MAIL_FROM` to use an SMTP server. `MAIL_DRIVER=production` selects the
production-provider adapter, which must be connected to a provider such as
AWS SES, Resend, or SendGrid before use. `POST /api/v1/auth/forgot-password`
always returns the same response for existing and unknown accounts; reset
codes expire after 10 minutes and are invalidated after five failed attempts.

Media uploads use the global `MediaFacadeService` and keep provider identifiers
on each asset so existing objects can continue using their original adapter.
`STORAGE_DRIVER` defaults to `s3`; provide `AWS_S3_BUCKET` and credentials through
the AWS SDK default credential chain. `AWS_REGION` defaults to `us-east-1`.
For MinIO, LocalStack, or an S3-compatible endpoint, set `AWS_S3_ENDPOINT` and
optionally `AWS_S3_FORCE_PATH_STYLE=true`. Set `AWS_S3_PROVIDER_NAME=r2` (or
`minio`) when that provider identity should be recorded, and configure
`AWS_CDN_BASE_URL` when assets should resolve through a CDN. The `gcs` driver is
an explicit adapter stub and returns an error until a GCS client is implemented.
Presigned uploads accept JPEG, PNG, and WebP files up to 5 MB and expire after
five minutes.

The user feature registers a Mongoose `User` model with required `username` and
unique, lowercase `email` fields. Mongoose manages the `createdAt` and
`updatedAt` timestamps.

## Authentication

Signup and signin set access and refresh tokens in HttpOnly cookies and return
only the user's profile in JSON. The refresh cookie is rotated by
`POST /api/v1/auth/refresh`; its hashed value is tracked per device, so signing
in on another device does not invalidate existing sessions. A rotated or
expired refresh token is rejected.

For browser clients, configure `CLIENT_ORIGIN` (defaults to
`http://localhost:5173`) and send requests with credentials enabled. For
example:

```js
await fetch('http://localhost:3000/api/v1/auth/signin', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
```

The browser stores and sends the HttpOnly cookies automatically; frontend
JavaScript cannot read the token values. Use `credentials: 'include'` for the
refresh request as well:

```js
await fetch('http://localhost:3000/api/v1/auth/refresh', {
  method: 'POST',
  credentials: 'include',
});
```

Log out the current device with:

```js
await fetch('http://localhost:3000/api/v1/auth/logout', {
  method: 'POST',
  credentials: 'include',
});
```

`POST /api/v1/auth/logout-all` revokes all refresh sessions for the authenticated
account and clears the current browser's cookies. `GET /api/v1/auth/sessions`
lists active devices without returning refresh tokens or their hashes. Revoke a
specific listed device with `DELETE /api/v1/auth/sessions/:jti`.

Logout revokes only the matching device's refresh session and clears both
cookies. If the refresh cookie is missing or invalid, the endpoint still clears
the cookies. Access tokens are stateless and can remain valid until their short
expiry, including after logout-all; the current architecture has no access-token
revocation list.

Session IP addresses use Express `request.ip`. The application does not enable
proxy trust, so client-supplied `X-Forwarded-For` values are not trusted. When
running behind a reverse proxy, configure Express to trust only the known proxy
addresses before relying on forwarded client IPs.

Do not copy tokens into local storage.

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

This project is already instrumented. To connect it, run this and approve the code it prints at [observe.nestjs.com/link](https://observe.nestjs.com/link) - signing up for free if you have no account:

```bash
$ npx @nestjs/observe link
```

It writes the app key and secret into `.env` and makes every `nest start` script (`start`, `start:dev`, `start:debug`) load it. In production, set `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` in the environment instead.

Or do it by hand: create an application and an API key at [observe.nestjs.com](https://observe.nestjs.com), and set the pair as `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` in the environment the app runs in.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
