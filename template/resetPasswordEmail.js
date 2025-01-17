const resetPasswordEmail = (hospitalName, resetLink) => {
    return `
      <!DOCTYPE html>
      <html lang="th">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset your password - Central Retail Corporation</title>
          <style>
              * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              }
      
              body {
                  background-color: #f5f5f5;
                  color: #333;
                  line-height: 1.5;
                  min-height: 100vh;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  padding: 20px;
              }
      
              .card-container {
                  background-color: white;
                  border-radius: 15px;
                  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                  padding: 40px;
                  width: 100%;
                  max-width: 600px;
                  margin: 20px;
              }
      
              .crc-logo {
                  width: 50%;
                  margin-bottom: 30px;
                  display: block; /* Ensure it behaves like a block element */
                  margin-left: auto; /* Center horizontally */
                  margin-right: auto; /* Center horizontally */
              }
      
              h1 {
                  font-size: 32px;
                  font-weight: 500;
                  margin-bottom: 20px;
                  color: #141414;
              }
      
              .greeting {
                  margin-top: 10px;
                  margin-bottom: 15px;
              }
      
              .reset-btn {
                  display: block;
                  width: 100%;
                  padding: 15px;
                  background-color: #E50914;
                  color: white;
                  text-align: center;
                  border: none;
                  border-radius: 4px;
                  font-size: 16px;
                  font-weight: 500;
                  cursor: pointer;
                  margin: 25px 0;
                  text-decoration: none;
                  transition: background-color 0.2s ease;
              }
      
              .reset-btn:hover {
                  background-color: #f40612;
              }
      
              .warning {
                  margin: 20px 0;
                  color: #666;
              }
      
              .help-text {
                  margin: 20px 0;
                  color: #666;
              }
      
              a {
                  color: #0071eb;
                  text-decoration: none;
                  transition: color 0.2s ease;
              }
      
              a:hover {
                  text-decoration: underline;
                  color: #0056b3;
              }
      
              .signature {
                  margin: 30px 0;
                  border-bottom: 1px solid #ddd;
                  padding-bottom: 30px;
              }
      
              .footer {
                  margin-top: 20px;
                  color: #737373;
                  font-size: 14px;
              }
      
              .footer img {
                  width: 150px;
                  margin-bottom: 10px;
              }
      
              .footer-links {
                  margin-top: 15px;
              }
      
              .footer-links a {
                  display: block;
                  color: #737373;
                  margin: 5px 0;
              }
      
              /* Responsive Design */
              @media (max-width: 480px) {
                  .card-container {
                      padding: 20px;
                      margin: 10px;
                  }
      
                  h1 {
                      font-size: 24px;
                  }
              }
          </style>
      </head>
      <body>
          <div class="card-container">
              <img src="https://firebasestorage.googleapis.com/v0/b/cg-ses-files-upload.appspot.com/o/hostingImage%2FCRC.BK_BIG.png?alt=media&token=5c12e3d6-f972-4bee-a137-ff12b6dcafbf" alt="crc Logo" class="crc-logo">
              
              <h2>ตั้งรหัสผ่านของคุณ / Set your password</h2>
              
              <p class="greeting">Dear ${hospitalName},</p>
              
              <p>กรุณาคลิกด้านล่างเพื่อดำเนินการ / Please click below to continue</p>
              
              <a href="${resetLink}" class="reset-btn">ตั้งรหัสผ่านของคุณ / Set your password</a>
              
              <p class="warning">
                  หากมีปัญหาการใช้งานหรือข้อสงสัยสามารถติดต่อเราได้ที่ / For any inquiries or issues, please contact us at <a href="mailto:ses@central.co.th">ses@central.co.th</a>
              </p>
              <p>วันและเวลาทำการ จันทร์ – ศุกร์ เวลา 8:30-18:00 น.</p>
              <p>(ยกเว้นวันเสาร์-อาทิตย์ และวันหยุดนักขัตฤกษ์)</p><br>
              <p>Business hours: Monday - Friday, 8:30AM - 6:00PM </p>
              <p>(except for public holidays)</p>
              <p class="signature">Central Retail HR Team</p>
              <div class="footer">
                  <img src="https://firebasestorage.googleapis.com/v0/b/cg-ses-files-upload.appspot.com/o/hostingImage%2FCRC.BK_BIG.png?alt=media&token=5c12e3d6-f972-4bee-a137-ff12b6dcafbf" alt="crc-Logo">
                  <div>Questions? Call 02-103-8862</div>
                  <div>HR Shared Employee Services</div>
                  <div>Central Retail Corporation Public Co.,Ltd.</div>
              </div>
          </div>
      </body>
      </html>  
      `;
  };
  
  module.exports = resetPasswordEmail;
  