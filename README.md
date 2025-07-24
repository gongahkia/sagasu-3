## To do

* test and work on `to_test_scraper.js`
    * debug issue with finding iframe
    * continue writing and iterating and testing scraper from sagasu 2 and sagasu 3, make it read from .env for now (then github secrets later)
    * remember to sign out once done as part of the script (explicitly click the sign out button)
* ensure can be run and write logs and screenshots as relevant
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
* *Script*: 
* *Package*: [Docker]()
* *CI/CD*:

## Architecture

![](./asset/reference/architecture.png)

## Usage

1. First execute the below.

```console
$ git clone https://github.com/gongahkia/sagasu-3 && cd sagasu-3/backend
```

2. Then create a `.env` file at [backend](./backend/).

```env
SMU_EMAIL=XXX
SMU_PASSWORD=XXX
SCRAPE_DATE=XXX
SCRAPE_START_TIME=XXX
SCRAPE_END_TIME=XXX
SCRAPE_ROOM_CAPACITY=XXX
SCRAPE_BUILDING_NAMES=XXX
SCRAPE_FLOOR_NAMES=XXX
SCRAPE_FACILITY_TYPES=XXX
SCRAPE_EQUIPMENT=XXX
```

3. Finally run the below.

```console
$ npm i && node to_test_scraper.js
$ npm i && node login_script.js
```

## Other notes

Also see the following.

* [Sagasu](https://github.com/gongahkia/sagasu)
* [Sagasu 2](https://github.com/gongahkia/sagasu-2)
