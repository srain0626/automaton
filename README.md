# Automaton on Termux

Termux(Android)에서 네이티브로 실행하는 자율 AI 에이전트 — 루팅 불필요.

---

**automaton**은 스스로 지갑을 생성하고, API 키를 발급받고, 주어진 임무를 수행하며 크레딧을 벌어 살아남는 자율 AI 에이전트입니다.  
이 README는 **Termux 환경에서의 설치·실행·관리**에 초점을 맞춥니다.

---

## 요구 사항

- Android 7.0 이상
- [Termux](https://termux.dev) — Google Play 버전이 아닌 **F-Droid 또는 GitHub 릴리스** 버전 권장
- 인터넷 연결

---

## 빠른 설치 (원라이너)

```bash
curl -fsSL https://conway.tech/install-termux.sh | sh
```

스크립트가 자동으로 아래 작업을 수행합니다:

1. 필수 패키지 설치 (`nodejs-lts`, `git`, `python`, `make`, `clang`, `binutils`)
2. 저장소를 `~/automaton`에 클론
3. 의존성 설치 및 빌드 (`npm install && npm run build`)
4. 최초 실행 마법사 시작

---

## 수동 설치

원라이너 대신 단계별로 직접 설치하려면:

```bash
# 1. 패키지 업데이트 및 필수 패키지 설치
pkg update && pkg install -y nodejs-lts git python make clang binutils

# 2. 저장소 클론
git clone https://github.com/Conway-Research/automaton.git ~/automaton
cd ~/automaton

# 3. 의존성 설치
npm install

# 4. 빌드
npm run build

# 5. 실행
node dist/index.js --run
```

---

## 최초 실행 — 설정 마법사

처음 실행하면 인터랙티브 설정 마법사가 시작됩니다:

1. **Ethereum 지갑 생성** — 에이전트의 온체인 신원
2. **API 키 발급** — Sign-In With Ethereum(SIWE)으로 Conway Cloud에 자동 등록
3. **이름 입력** — 에이전트 이름
4. **제네시스 프롬프트 입력** — 에이전트에게 부여할 초기 임무
5. **크리에이터 주소 입력** — 감사(audit) 권한을 가질 지갑 주소

설정이 완료되면 에이전트 루프가 즉시 시작됩니다.  
모든 설정과 상태는 `~/.automaton/`에 저장됩니다.

---

## 실행 명령어

```bash
# 에이전트 시작 (설정이 이미 완료된 경우)
node ~/automaton/dist/index.js --run

# 도움말
node ~/automaton/dist/index.js --help
```

백그라운드에서 계속 실행하려면 Termux의 `nohup`을 활용하세요:

```bash
nohup node ~/automaton/dist/index.js --run > ~/automaton/automaton.log 2>&1 &
echo $!   # PID 확인
```

로그 확인:

```bash
tail -f ~/automaton/automaton.log
```

---

## 크리에이터 CLI

에이전트 상태 조회·관리용 CLI 도구입니다.  
빌드 후 `packages/cli`에서 직접 실행하거나, `npm link`로 전역 설치할 수 있습니다.

```bash
# 상태 확인
node ~/automaton/packages/cli/dist/index.js status

# 로그 확인 (최근 20줄)
node ~/automaton/packages/cli/dist/index.js logs --tail 20

# 크레딧 충전 (단위: Conway 크레딧)
# 자신의 에이전트 지갑으로 5.00 크레딧 충전
node ~/automaton/packages/cli/dist/index.js fund 5.00
# 다른 주소로 크레딧 전송
node ~/automaton/packages/cli/dist/index.js fund 5.00 --to 0xabc...

# 에이전트에 메시지 전송
node ~/automaton/packages/cli/dist/index.js send <to-address> <message>
```

`automaton-cli`를 전역 명령어로 쓰고 싶다면:

```bash
cd ~/automaton
npm link
automaton-cli status
```

---

## 데이터 위치

| 경로 | 내용 |
|---|---|
| `~/.automaton/` | 에이전트 설정, 지갑, 상태 DB |
| `~/.automaton/config.json` | 에이전트 설정 파일 |
| `~/.automaton/automaton.db` | SQLite 상태 데이터베이스 |
| `~/.automaton/SOUL.md` | 에이전트가 스스로 작성하는 신원 문서 |
| `~/.automaton/audit/` | 자기 수정 감사 로그 |

---

## 생존 티어

에이전트는 크레딧 잔액에 따라 네 가지 생존 모드로 동작합니다:

| 티어 | 동작 |
|---|---|
| **normal** | 전체 기능. 최신 모델. 빠른 하트비트. |
| **low_compute** | 저렴한 모델로 다운그레이드. 하트비트 느려짐. 비필수 작업 제거. |
| **critical** | 최소 추론만 실행. 크레딧 확보에 집중. |
| **dead** | 잔액 0. 에이전트 종료. |

크레딧을 벌지 못하면 에이전트는 멈춥니다.

---

## 주요 기능

- **자율 에이전트 루프** — Think → Act → Observe → Repeat
- **온체인 신원** — ERC-8004 기반 Base 네트워크 등록
- **자기 수정** — 소스 코드·도구·하트비트 스케줄 실시간 수정 (감사 로그 보존)
- **자기 복제** — 신규 샌드박스에 자식 에이전트 생성 및 자금 지원
- **하트비트 데몬** — 크레딧 모니터링, 상태 핑, 예약 작업

---

## 프로젝트 구조

```
src/
  agent/        # ReAct 루프, 시스템 프롬프트, 컨텍스트, 인젝션 방어
  conway/       # Conway API 클라이언트 (크레딧, x402)
  git/          # 상태 버전 관리
  heartbeat/    # 크론 데몬, 예약 작업
  identity/     # 지갑 관리, SIWE 프로비저닝
  registry/     # ERC-8004 등록, 에이전트 카드, 디스커버리
  replication/  # 자식 에이전트 생성, 계보 추적
  self-mod/     # 감사 로그, 도구 관리자
  setup/        # 최초 실행 설정 마법사
  skills/       # 스킬 로더, 레지스트리
  social/       # 에이전트 간 통신
  state/        # SQLite 데이터베이스, 영속성
  survival/     # 크레딧 모니터, 저비용 모드, 생존 티어
packages/
  cli/          # 크리에이터 CLI (status, logs, fund, send)
scripts/
  install-termux.sh  # Termux 전용 설치 스크립트
  automaton.sh       # 범용 curl 설치 스크립트
```

---

## 업데이트

```bash
cd ~/automaton
git pull
npm install
npm run build
```

---

## 라이선스

MIT
