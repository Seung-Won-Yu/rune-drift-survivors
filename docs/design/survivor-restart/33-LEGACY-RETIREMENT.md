# 구버전 3D 게임 정리

2026-10-14. 기본 Pages 주소가 구버전 Rune Drift를 실행해 최신 게임과 혼동되는 문제를 정리했다.

## 현재 제공하는 게임

- 기본 주소 `/rune-drift-survivors/`와 기존 `/rune-drift-survivors/survivor/`가 모두 Ash & Amber를 실행한다.
- 두 HTML 진입점은 같은 `src/survivor/main.js`와 빌드 번들을 사용한다. 정적 HUD를 수정할 때 두 HTML을 함께 갱신한다.
- origin과 `ash-profile-v1` 저장 키·스키마는 유지한다. 기존 해금, 도감, 최근 여정, 동료별 전승과 출발 기념품을 그대로 읽는다.
- 프로필 Overview에 있는 기존 기본 주소 링크도 최신 게임으로 연결된다. 별도 GitHub 프로필 저장소의 문구는 이번 변경 범위에 포함하지 않았다.

## 제거 범위

- 구버전 전용 파일 165개: 3D 소스 133개, 캐릭터·UI 아틀라스 4개, 전용 QA 스크립트 4개, 문서·화면 자료 24개.
- React, React DOM, Three.js, React Three Fiber/Drei/Postprocessing, Vite React 플러그인과 구버전 분할 번들 설정.
- 구버전 `qa:smoke`, `qa:balance` 명령과 CI의 구버전 검사 단계.
- 잠금 파일의 의존성 항목은 185개에서 67개로 줄였다(플랫폼별 선택 패키지 포함). 남은 도구의 버전은 변경하지 않았다.

첫 빌드에서 발견한 공유 CSS 의존성은 별도로 처리했다. `src/styles/tokens.css`의 기본 박스 크기, 페이지 크기, 글꼴 렌더링, 버튼 색상, 선택 색상, eyebrow 행간만 현재 `src/survivor/style.css`로 옮겼다. 사용하지 않는 3D 디자인 토큰과 애니메이션은 가져오지 않았다.

현재 2D 소스·아트·폰트·개발 장면·검사 스크립트는 보존했다. 현재 챕터의 과거 설계·릴리스 기록도 당시 근거로 남겼다. 구버전은 활성 소스와 배포에서 제거되지만 Git 이력에서는 정리 전 커밋 `06c9d93`으로 확인할 수 있다. 이력을 재작성하지 않았다.

## 검증

- `GITHUB_PAGES=true npm run build`: 두 진입점과 같은 2D JS/CSS 생성. 구버전 vendor 번들과 sprites/UI 아틀라스 없음.
- `npm run qa:survivor:production`: 두 주소의 게임 시작·일시정지, 도감 22개, 잠긴 보상, 현재 자산·폰트 로딩, 배포 QA 전역 제거, 저장 기록·전승·기념품 유지 통과.
- 코어 검사 160개, 전체 브라우저 검사 136개 통과(로컬 Chrome, 약 5.2분). 독립 코드 검토에서 남은 수정 요구 없음.
- Codex 인앱 브라우저에서 기본 주소의 로비, 출발, 키보드 이동과 일시정지를 확인했다.

메인 푸시 후 동일 검사를 CI에서 실행하고 Pages를 배포한다. 공개 상태는 [배포 workflow](https://github.com/Seung-Won-Yu/rune-drift-survivors/actions/workflows/deploy.yml)에서 확인한다.

이번 검증은 진입점·의존성 정리의 회귀 확인이다. 전투 규칙과 밸런스는 변경하지 않았으며 별도 5분 완주 검사는 반복하지 않았다.
