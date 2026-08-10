# Rune visual reboot — experience map

## Gameplay hierarchy

1. 전투 공간과 플레이어
2. 체력과 위험 상태
3. XP와 레벨
4. 남은 시간과 런 단계
5. 현재 행동 안내
6. 조합/목표/통계

## Screen inventory

| Screen | Primary information | Primary action | Secondary information |
| --- | --- | --- | --- |
| Loading | 준비 상태, 진행률, 오류 | 다시 불러오기 | 현재 준비 단계 |
| Gameplay | HP, XP, 시간, 위험 | 이동, 대시 | 튜토리얼, 목표, 알림 |
| Upgrade | 각인 이름, 즉시 효과, 역할 | 각인 선택 | 조합 진척, 추천 이유 |
| Pause | 현재 런 요약 | 계속하기 | 조작, 재시작 |
| Result | 승패, 등급, 빌드 결과 | 다시 도전 | DPS, 제단, 조합 |

## Responsive rules

- Portrait: 상단 좌우 상태 바, 중앙 하단 전투 공간 보존, 양 엄지 컨트롤 고정
- Landscape: HUD는 좌측 상단 한 덩어리로 제한, 플레이어 중심과 우측 전투 공간을 비움
- Desktop: HUD는 좌상단, 시간은 상단 중앙에 가깝게 배치, 선택 오버레이는 중앙
- Touch target: 44px 이상
- Modal: 작은 화면에서 전체 높이를 넘지 않고 내부 스크롤

## State rules

- Loading: 게임 에셋 준비 전 HUD를 노출하지 않는다.
- Error: 원인과 재시도 행동을 한 화면에서 제공한다.
- Low HP: 붉은 프레임과 `위험` 라벨을 함께 사용한다.
- Upgrade: 세 선택지의 구조와 정보 위치는 동일하게 유지한다.
- Pause: 실수로 재시작하지 않도록 재시작을 보조 행동으로 둔다.
- Win/loss: 제목, 색, 등급 문구로 상태를 중복 전달한다.
