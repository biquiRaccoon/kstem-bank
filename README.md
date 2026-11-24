# K-STEM Bank 교구 찾기 (서울 11개 교육지원청 통합)

로그인 없이 누구나 쓰는 교구 검색 사이트입니다. GitHub의 무료 기능만 사용합니다.

- **GitHub Actions**(무료 서버 역할): 10분마다 11개 지원청 공개 교구목록을 수집해 `data.json`을 만듭니다.
- **GitHub Pages**(무료 호스팅): `https://<아이디>.github.io/<저장소이름>/` 주소로 사이트를 공개합니다.
- 공개 저장소면 비용 0원, 카드 등록 불필요, PC를 켜 둘 필요 없음.

## 처음 설정 (약 5분)

1. GitHub에서 **새 공개(Public) 저장소** 만들기 (예: `kstem-bank`).
2. 이 폴더의 파일을 그대로 올리기 (`.github` 폴더 포함).
   - 웹에서 올릴 때 `.github` 같은 점(.) 폴더가 빠지기 쉬우니, *Add file → Create new file*에서 `.github/workflows/update.yml` 경로로 직접 만들어 내용을 붙여 넣어도 됩니다.
3. 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 선택.
4. **Actions** 탭 → "교구 목록 10분 자동 갱신" → **Run workflow** 한 번 실행.
5. 1~2분 뒤 `https://<아이디>.github.io/<저장소이름>/` 접속.

## 알아 둘 점

- GitHub 예약 실행은 바쁠 때 몇 분씩 늦어질 수 있습니다(보통 10~15분 간격).
- 어떤 지원청 수집이 실패하면 그 지원청은 직전 목록을 유지하고, 화면 상단 상태 표시에 "지연"으로 나옵니다.
- 공개 저장소에 60일간 변화가 없으면 GitHub가 예약 실행을 멈추는데, 매월 1일 자동 keepalive 커밋으로 막아 두었습니다.
- 수량은 지원청이 등록한 **보유 수량**입니다. 날짜별 대여 가능 여부는 원본 대여 페이지에서 확인해야 합니다.

## 파일

| 경로 | 역할 |
|---|---|
| `scripts/scrape.mjs` | 수집기 (Node 20, 외부 패키지 없음) |
| `.github/workflows/update.yml` | 10분 주기 수집 + Pages 배포 |
| `public/index.html` | 사이트 화면 (검색, 지원청별 비교, 바구니, 신청서 초안) |
| `public/seed-data.json` | 2026-11-23 수집 스냅샷 (첫 실행 실패 대비) |

수집 원본: `https://ssei.sen.go.kr/fus/MI000000000000000351/gyoguManageList.do?board_id=<지원청코드>`
