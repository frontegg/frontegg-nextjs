
![alt text](https://raw.githubusercontent.com/frontegg/frontegg-nextjs/master/logo.png)

### Getting Started

## Installation
```bash
yarn dev
```

## Adding environment variables

Create a new file named `.env.local` under your root project directory.
In this file add the following configuration options:

```dotenv
# The AppUrl is to tell Frontegg your application hostname
FRONTEGG_APP_URL='http://localhost:3000'

# The Frontegg domain is your unique URL to connect to the Frontegg gateway
FRONTEGG_BASE_URL='https://{YOUR_SUB_DOMAIN}.frontegg.com'

# Your Frontegg application's Client ID
FRONTEGG_CLIENT_ID='{YOUR_APPLICATION_CLIENT_ID}'

# The stateless session encryption password, used to encrypt
# jwt before sending it to the client side.
#
# For quick password generation use the following command:
#    node -e "console.log(crypto.randomBytes(32).toString('hex'))"
FRONTEGG_ENCRYPTION_PASSWORD='{SESSION_ENCRYPTION_PASSWORD}'

```

## Running 
```bash
yarn dev
```

## Building 
```bash
yarn build
```
