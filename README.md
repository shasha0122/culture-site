# 서울 문화행사 안내

서울 열린데이터광장의 문화행사 OpenAPI를 이용해 공연·전시·축제 정보를 보여주는 간단한 웹사이트입니다.

## 로컬에서 실행

1. `.env.example`을 복사해 `.env`를 만들고, 서울시 OpenAPI 인증키를 넣습니다.

```
SEOUL_API_KEY=발급받은_인증키
```

2. 서버를 실행합니다.

```
node server.js
```

3. 브라우저에서 http://localhost:5500 을 엽니다.

로컬에서는 Node 서버가 서울시 API를 대신 호출하므로 최신 목록을 바로 볼 수 있습니다.

## GitHub Pages

[GitHub Pages](https://shasha0122.github.io/culture-site/)는 정적 파일만 호스팅합니다. 브라우저가 서울시 API를 직접 호출할 수 없어, `data/events.json`에 미리 받아 둔 목록을 보여줍니다.

목록을 갱신하려면 로컬에서 `npm run fetch-events`를 실행한 뒤 커밋하거나, GitHub 저장소 Secrets에 `SEOUL_API_KEY`를 넣은 다음 Actions의 Refresh events 워크플로를 실행하면 됩니다.
