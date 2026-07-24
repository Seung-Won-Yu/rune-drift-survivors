# Rune Drift Survivors

룬 유적을 달리며 5분 동안 성장하는 3D 자동 전투 로그라이트입니다. 이동과 대시는 직접 조작하고, 무기 조합·필드 아이템·엘리트·보스에 대응하며 한 번의 빌드를 완성합니다.

**[Play Now](https://seung-won-yu.github.io/rune-drift-survivors/)** · **React 19** · **Three.js / React Three Fiber** · **Zustand** · **Vite**

## 게임 흐름

```text
이동 학습 → XP와 기본 성장 → 무기 방향 선택 → 시너지 완성 → 최종 공세 생존
```

- 숲과 룬 유적으로 구성된 3D 아레나
- 첫 플레이 이동·대시·XP·무기고 안내
- 전투 리듬에 따라 강해지는 웨이브와 단계별 목표
- 엘리트 경고, 보스 체력·패턴·분노 단계
- 업그레이드 카드, 일시정지와 결과 요약 화면
- 데스크톱과 모바일에 맞춘 HUD·조이스틱·대시 버튼

## 전투 시스템

| 분류 | 구성 |
| --- | --- |
| 무기 | Rune Orb, Storm Brand, Orbit Blade, Chain Lightning, Solar Nova |
| 시너지 | Storm + Lightning, Blade + Solar Nova, Rune Orb + Pierce |
| 필드 아이템 | Magnet, Purge, Heal, Overload, Armory Cache |
| 적 | Runner, Golem, Brute, Elite, Boss |
| 결과 | 등급, 최고 DPS 무기, 빌드, 보상, 엘리트·보스 처치 |

## 조작

| 동작 | 키보드 | 모바일 |
| --- | --- | --- |
| 이동 | `WASD` 또는 방향키 | 화면 조이스틱 |
| 대시 | `Space` | 대시 버튼 |
| 일시정지 | `P` 또는 `Esc` | 일시정지 버튼 |
| 재시작 | 결과 화면 버튼 | 결과 화면 버튼 |

## 그래픽 품질

기본값은 선명도와 안정성의 균형을 맞춘 `balanced`입니다.

```text
?quality=low
?quality=balanced
?quality=high
?quality=high&fx=on
?quality=cinematic
```

- `low`: 모바일, 고해상도 소형 화면과 저사양 기기
- `balanced`: 기본 지형 디테일과 제한된 DPR
- `high`: 더 높은 렌더 품질
- `fx=on`: bloom·vignette 후처리 활성화
- `cinematic`: 고품질 환경과 후처리 조합

적·발사체·XP·데미지 숫자·효과에는 런타임 상한과 프레임 압력에 따른 가변 예산을 적용합니다.

## 빠른 시작

```bash
npm install
npm run dev
```

프로덕션 빌드와 미리보기:

```bash
npm run build
npm run preview
```

## 브라우저 검증

```bash
npm run qa:smoke
```

Playwright smoke suite가 HUD, 업그레이드 카드, 보스, 결과 화면과 스트레스 예산을 실제 Chrome 흐름으로 확인합니다. QA 화면에서는 `window.__RUNE_DRIFT_QA__.metrics()`로 FPS와 오브젝트 예산을 조회할 수 있습니다.

## 프로젝트 구조

```text
src/                       게임 상태, 전투, 3D 씬과 UI
public/models/             브라우저에서 불러오는 GLB 모델
scripts/                   Playwright QA와 에셋 변환 도구
docs/project-structure.md  상세 코드 구조
ASSET_CREDITS.md           외부 에셋 출처와 라이선스
vite.config.js             개발·Pages 빌드 설정
```

## 배포

`main` 브랜치에 푸시하면 `.github/workflows/deploy.yml`이 다음 Pages 빌드를 실행하고 `dist/`를 배포합니다.

```bash
npm ci
GITHUB_PAGES=true npm run build
```

모델과 정적 자산은 `import.meta.env.BASE_URL`을 사용하므로 `/rune-drift-survivors/` 하위 경로에서 동작합니다.

## 에셋

실행에 필요한 GLB는 `public/models/`에 포함됩니다. 원본과 라이선스 정보는 [ASSET_CREDITS.md](ASSET_CREDITS.md)와 [`assets/references/asset-sources.md`](assets/references/asset-sources.md)를 따릅니다.
