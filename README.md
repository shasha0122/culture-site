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

## Vercel / Netlify에 올려 최신 API 공개하기

이 프로젝트는 React가 아닙니다. `REACT_APP_API_KEY`처럼 `REACT_APP_`으로 시작하는 값은 브라우저 코드에 그대로 들어가서 인증키가 공개됩니다.

대신 **서버 전용** 환경 변수 `SEOUL_API_KEY`를 넣고, 서버리스 함수(`/api/events`)가 서울시 API를 대신 호출하게 되어 있습니다.

### Vercel

1. [Vercel](https://vercel.com)에서 GitHub 저장소 `culture-site`를 Import합니다.
2. Settings → Environment Variables에 아래를 추가합니다.
   - Name: `SEOUL_API_KEY`
   - Value: 서울시 OpenAPI 인증키
3. Redeploy 합니다.

### Netlify

1. [Netlify](https://netlify.com)에서 같은 GitHub 저장소를 Import합니다.
2. Site configuration → Environment variables에 `SEOUL_API_KEY`를 추가합니다.
3. Redeploy 합니다.

## GitHub Pages

[GitHub Pages](https://shasha0122.github.io/culture-site/)는 정적 파일만 호스팅합니다. 서버리스 함수가 없어 `data/events.json`에 미리 받아 둔 목록을 보여줍니다.

목록을 갱신하려면 로컬에서 `npm run fetch-events`를 실행한 뒤 커밋하면 됩니다.
