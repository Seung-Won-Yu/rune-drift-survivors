# 캐릭터 비교 시안 제작 기록

2026-09-08 · built-in image_gen 사용. 원본 생성 이미지를 변경 없이 이 폴더로 복사했다.
16개 포즈의 4×4 시트이며, 브라우저에서는 각 포즈를 잘라 표시한다. 독자 캐릭터의 초안이고 제작용 완성 자산은 아니다. 도트도 AI 생성 시안으로, 픽셀 정렬과 프레임별 체형의 최종 수작업 정리가 필요하다.

요청 크기는 1024×1024였으나 실제 출력은 1254×1254 RGBA다. 렌더러는 실제 이미지 크기를 사용한다. 공격 행의 검 궤적이 정규 셀을 넘으므로 관찰한 가로 경계 [0, 313, 657, 984, 1254]로 표시한다. 원본 파일은 수정하지 않았다. 여백 보완 및 배경 제거 편집을 추가 시도했으나 체크무늬가 이미지에 포함된 RGB 출력이어서 채택하지 않았다.

## 최종 생성 프롬프트

Use case: stylized-concept.
Asset type: animation sprite sheet for a browser game style comparison. Create ONE square 1024x1024 image, exact regular 4 columns x 4 rows of 256x256 cells, no gaps, no labels or grid lines. True transparent background throughout, no checkerboard painted into image.
Primary request: the SAME original small fantasy adventurer animated in two styles, pixel art and clean hand-drawn cartoon, so they can be compared fairly. Character identity: young gender-neutral ash-haired rune swordsman, short dark teal cape, warm cream tunic, charcoal boots, one oversized amber bronze short sword, small amber clasp. Confident, charming, not a generic hooded wizard. 3/4 game view looking to the RIGHT and slightly toward viewer; same proportions (large head, short body), colors and equipment in all sixteen cells.
Layout exact: each cell keeps character body center at local x128 and feet baseline at local y212, figure from about y55 to y212, full sword stays within x20..236. No floor, no cast shadows, no scenery. All poses entire body visible with generous margins.
ROW 1 (top, y0..255): PIXEL ART WALK cycle four keyframes from left to right: right foot forward; passing crouch; left foot forward; passing rise. Discrete crisp pixel blocks, limited palette, approximately a 48px sprite enlarged as crisp blocks. Cape swings opposite stepping direction. Sword held low, matching movement.
ROW 2 (y256..511): SAME PIXEL ART character ATTACK four frames: strong windup sword behind above head and torso turned back; powerful forward right slash with thin amber crescent; follow-through sword low right, body leans forward; recovery upright sword returns. Real limb and torso pose changes, not simply rotated whole images. Pixel slash only within cell.
ROW 3 (y512..767): SAME character and same four WALK poses as row 1 in CLEAN CARTOON style, bold dark outline of consistent width, flat color with two-tone cel shading, smooth contours, more elastic knees, expressive eyes, cape follow-through. No painterly texture, no 3D rendering.
ROW 4 (bottom, y768..1023): SAME CARTOON character same four ATTACK poses as row 2, readable anticipation and squash/stretch, snappy amber slash, recovery.
Important: sixteen sprites total, exactly one frame per cell, identical framing and baseline. Clear difference between crunchy pixel clusters in top half and smooth cartoon linework in bottom half. Transparent alpha. No typography, titles, frame numbers, borders, extra characters or props.
