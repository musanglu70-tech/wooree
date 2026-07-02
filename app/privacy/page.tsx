export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px", fontFamily: "sans-serif", lineHeight: 1.8, color: "#333" }}>
      <h1 style={{ fontSize: 28, fontWeight: "bold", marginBottom: 8 }}>개인정보처리방침</h1>
      <p style={{ color: "#666", marginBottom: 32 }}>최종 업데이트: 2026년 7월 2일</p>

      <p>
        (주)우리메디텍(이하 "회사")은 CSO(주)우리메디텍 앱(이하 "앱") 이용자의 개인정보를 소중히 여기며,
        「개인정보 보호법」 및 관련 법령을 준수합니다.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: "bold", marginTop: 32, marginBottom: 8 }}>1. 수집하는 개인정보</h2>
      <p>본 앱은 별도의 회원가입 없이 정보를 제공하는 서비스입니다. 앱 자체적으로 개인정보를 수집하지 않습니다.</p>
      <p>단, 앱 내 웹 서비스 이용 시 서비스 제공을 위해 아이디 및 비밀번호가 사용될 수 있으며, 이는 회사 내부 시스템에서만 처리됩니다.</p>

      <h2 style={{ fontSize: 20, fontWeight: "bold", marginTop: 32, marginBottom: 8 }}>2. 개인정보 이용 목적</h2>
      <p>수집된 정보는 다음 목적으로만 사용됩니다:</p>
      <ul style={{ paddingLeft: 20 }}>
        <li>서비스 제공 및 운영</li>
        <li>이용자 인증</li>
        <li>서비스 개선</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: "bold", marginTop: 32, marginBottom: 8 }}>3. 개인정보 보관 기간</h2>
      <p>
        회사는 서비스 이용 기간 동안 개인정보를 보관합니다.
        이용자가 서비스 탈퇴 또는 계정 삭제를 요청할 경우, <strong>요청일로부터 30일 이내</strong>에 해당 정보를 삭제합니다.
        단, 관련 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관 후 삭제합니다.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: "bold", marginTop: 32, marginBottom: 8 }}>4. 개인정보 삭제 절차</h2>
      <p>이용자는 언제든지 본인의 개인정보 삭제를 요청할 수 있습니다:</p>
      <ul style={{ paddingLeft: 20 }}>
        <li>이메일 요청: <strong>woorimedi2018@gmail.com</strong></li>
        <li>요청 접수 후 <strong>7영업일 이내</strong> 처리 및 결과 통보</li>
        <li>삭제된 정보는 복구되지 않습니다</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: "bold", marginTop: 32, marginBottom: 8 }}>5. 제3자 제공</h2>
      <p>회사는 이용자의 개인정보를 제3자에게 제공하지 않습니다.</p>

      <h2 style={{ fontSize: 20, fontWeight: "bold", marginTop: 32, marginBottom: 8 }}>6. 개인정보 보호책임자</h2>
      <p>
        이름: (주)우리메디텍 개인정보 담당자<br />
        이메일: woorimedi2018@gmail.com
      </p>

      <h2 style={{ fontSize: 20, fontWeight: "bold", marginTop: 32, marginBottom: 8 }}>7. 방침 변경</h2>
      <p>본 개인정보처리방침은 법령 또는 서비스 변경 시 업데이트될 수 있으며, 변경 시 앱 내 공지합니다.</p>
    </main>
  );
}
