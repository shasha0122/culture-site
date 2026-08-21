# 서울 문화행사 안내

서울 열린데이터광장의 문화행사 OpenAPI를 이용해 공연·전시·축제 정보를 보여주는 간단한 웹사이트입니다.

## 실행 방법

1. `.env.example`을 복사해 `.env`를 만들고, 서울시 OpenAPI 인증키를 넣습니다.

```
SEOUL_API_KEY=발급받은_인증키
```

2. 서버를 실행합니다.

```
node server.js
```

3. 브라우저에서 http://localhost:5500 을 엽니다.
