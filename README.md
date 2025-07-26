## To do

* remember to sign out once done as part of the script (explicitly click the sign out button)
* make scraper read from github secrets
* then have it deploy a simple frontend via github pages for me to view
* look into alternatives to run the scraper whenever i call the frontend but limit number of calls a day on the frontend client side
* then write a simple frontend that is deployed via github pages instead of vercel similar to llmarena project for jsoh
* see whether this can be deployed also as a telegram app
* then furnish this README.md as required
* see whether i can apply booking functionality as an extension of this
* actually write an xml scraper script that monitors whether XML schema of the site has changed and flags accordingly

[![](https://img.shields.io/badge/sagasu_3.0.0-passing-green)](https://github.com/gongahkia/sagasu-3/releases/tag/1.0.0)

# `Sagasu 3`

<p align="center">
    <img src="./asset/logo/three_logo.png" width=55% height=55%>
</p>

`Sagasu 3` is provided as 

## Rationale

...

## Stack

* *Frontend*: 
* *Backend*:
* *Auth*: 
* *Script*: [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript), [Python](https://www.python.org/)
* *Package*: [Docker](https://www.docker.com/)
* *CI/CD*:

## Architecture

![](./asset/reference/architecture.png)

## Usage

1. First execute the below.

```console
$ git clone https://github.com/gongahkia/sagasu-3 
```

2. Then create a `.env` file at [backend](./backend/).

```env
SMU_EMAIL=XXX
SMU_PASSWORD=XXX
```

3. Run the `.env` population [script](./lib/cli.py).

```console
$ python3 -m venv myenv && source myenv/bin/activate && pip install -r lib/requirements.txt
$ python3 lib/cli.py
```

4. Finally run the below.

```
$ npx playwright install
$ cd backend && npm i && node scraper.js
$ cd backend && npm i && node login_script.js
```

## Other notes

Also see the following.

* [Sagasu](https://github.com/gongahkia/sagasu)
* [Sagasu 2](https://github.com/gongahkia/sagasu-2)
