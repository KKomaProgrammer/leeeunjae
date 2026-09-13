# 이은재 숙제 게시판 · 프론트엔드

기존 `KKomaProgrammer/leeeunjaespeaking`의 화면과 기능을 그대로 사용하는 GitHub Pages 프론트엔드입니다.

- 사이트: https://leeeunjae.kro.kr
- API 서버: https://eunjae.pages.dev
- GitHub Pages 게시 위치: **Deploy from a branch → main → / (root)**
- 기존 `CNAME`은 유지합니다. HTTPS가 활성화되어야 푸시 알림, 설치, 이미지 공유 등의 브라우저 기능을 사용할 수 있습니다.

`index.html`, `assets/`, `sw.js`, `manifest.webmanifest`, `icon.svg`는 바로 게시할 수 있도록 빌드한 파일입니다.
편집할 원본은 `frontend/`에 있습니다. 화면 수정 후 다음 명령을 실행하고 생성된 파일을 함께 커밋하면 됩니다.

```sh
npm ci
npm run build
```

`scripts/build.mjs`가 모든 API 요청의 서버를 `https://eunjae.pages.dev`로 지정합니다.
Cloudflare Functions, D1, 문자 발송사 키, 알림 Worker는 기존 저장소와 Cloudflare에 그대로 유지합니다.
이 저장소에는 서버 코드나 비밀값, 도메인 이전 안내가 들어 있지 않습니다.

## Cloudflare 설정

기존 Cloudflare Pages에 `SITE_FRONTEND` 환경변수 하나를 추가하고 재배포합니다.

| 값 | Cloudflare 주소의 화면 |
| --- | --- |
| `1` 또는 미설정 | 기존 로그인 및 게시판 |
| `https://leeeunjae.kro.kr` | 새 사이트 안내 및 연결 링크 |
| 다른 HTTP/HTTPS URL 또는 도메인 | 지정한 사이트 안내 및 연결 링크 |

GitHub Pages 화면에는 이 설정이 영향을 주지 않습니다.
Cloudflare API는 새 도메인의 HTTP/HTTPS 출처와 `SITE_FRONTEND`에 지정한 출처를 허용합니다.
알림 Worker의 `PUBLIC_SITE_URL`은 **기존 `https://eunjae.pages.dev`를 유지**합니다.

브라우저 알림 권한, 푸시 구독, 문자 인증 상태는 사이트별로 저장됩니다. 새 도메인에서 다시 등록해야 하며,
기존 사이트에서 등록한 알림은 자동으로 해제되지 않습니다. 중복 알림을 피하려면 이전하기 전에 기존 등록을 해제합니다.

개발 서버의 localhost는 운영 API 허용 출처에 포함하지 않았습니다. 로컬에서 로그인까지 검증하려면
기존 백엔드를 로컬 실행하고 개발 환경의 `VITE_API_BASE_URL`과 테스트용 허용 출처를 설정합니다.
