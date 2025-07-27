[![](https://img.shields.io/badge/sagasu_3.0.0-passing-green)](https://github.com/gongahkia/sagasu-3/releases/tag/1.0.0)
![](https://github.com/gongahkia/sagasu-3/actions/workflows/scrape.yml/badge.svg)
![](https://github.com/gongahkia/sagasu-3/actions/workflows/generate.yml/badge.svg)

# `Sagasu 3`

<p align="center">
    <img src="./asset/logo/three_logo.png" width=55% height=55%>
</p>

`Sagasu 3` is served as a [Web App](./.github/workflows/generate.yml), with a [scheduled scraper](./.github/workflows/scrape.yml) that runs daily at 9am and 12pm SGT per [this](#configuration) configuration.

Access the ***Live Web App*** [here](#usage).

## Stack

* *Frontend*: [HTML](https://developer.mozilla.org/en-US/docs/Web/HTML), [CSS](https://developer.mozilla.org/en-US/docs/Web/CSS), [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript), [Github Pages Site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
* *Backend*: [Playwright](https://github.com/microsoft/playwright), [Github Actions](https://docs.github.com/en/actions), [Node.js](https://nodejs.org/en)
* *Script*: [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript), [Python](https://www.python.org/)

## Rationale

Enough has already been said. If you must know why `Sagasu 3` exists, see [here](https://github.com/gongahkia/sagasu#rationale) or [here](https://github.com/gongahkia/sagasu-2#rationale).

<div align="center">
    <img src="./asset/reference/enough.webp" width="50%">
</div>


## Architecture

![](./asset/reference/architecture.png)

## Screenshot

<div align="center">
    <img src="./asset/reference/1.png" width="48%">
    <img src="./asset/reference/2.png" width="48%">
</div>

## Usage

The easiest way to access `Sagasu 3` is via the ***Live Web App*** at [gabrielongzm.com/sagasu-3](https://gabrielongzm.com/sagasu-3/).

The below instructions are for locally hosting and running `Sagasu 3`'s scraper.

1. First execute the below.

```console
$ git clone https://github.com/gongahkia/sagasu-3 
```

2. Then create a `.env` file at [backend](./backend/).

```env
SMU_EMAIL=XXX
SMU_PASSWORD=XXX
```

3. Run the `.env` population [script](./lib/cli.py) to specify the scraping configuration.

```console
$ python3 -m venv myenv && source myenv/bin/activate && pip install -r lib/requirements.txt
$ python3 lib/cli.py
```

4. Finally run the below.

```
$ npx playwright install
$ cd backend && npm i && node scraper-dev.js
```

## Configuration

```env
SCRAPE_DATE=<current_day>
SCRAPE_START_TIME='10:00'
SCRAPE_END_TIME='17:00'
SCRAPE_ROOM_CAPACITY='From6To10Pax'
SCRAPE_BUILDING_NAMES='Yong Pung How School of Law/Kwa Geok Choo Law Library'
SCRAPE_FLOOR_NAMES='Level 4,Level 5'
SCRAPE_FACILITY_TYPES='Project Room'
SCRAPE_EQUIPMENT='TV Panel'
```

## Other notes

`Sagasu 3` rose from the ashes of the below now archived projects.

* [Sagasu](https://github.com/gongahkia/sagasu)
* [Sagasu 2](https://github.com/gongahkia/sagasu-2)
