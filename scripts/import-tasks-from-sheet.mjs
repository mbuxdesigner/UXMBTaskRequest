/**
 * Script tự động import hàng loạt 14 bài toán từ bảng tính lên hệ thống Google Sheet (RAW_TASKS)
 * Nguồn dữ liệu: Google Sheet UX MBBank (Squad Card & Lending)
 */

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyz4_GK_guUx9L6uaRd4vK5jqJwG60eLr8Xju3j2hcEUianS8873cp4fJe8BBBrilKQ/exec';

const TASKS_DATA = [
  {
    stt: 1,
    squad: 'Card',
    product: 'App MBBank',
    title: 'Audit nâng cấp thường nhật UI thẻ',
    request_type: 'Tính năng',
    description: `Đã thực hiện:
- Bổ sung yêu cầu hiển thị cả những giao dịch chưa fin
- Chỉnh sửa luồng mua thẻ Hi
- Chỉnh sửa các trang xác nhận thông tin đồng bộ cách hiển thị Thẻ
/
- Trải nghiệm phát hành thẻ không hỗ trợ người dùng chọn thẻ, thông tin quá dày đặc và kông có đặc điểm j giúp người dùng biết thẻ có gì đặc biệt,
- Trải nghiệm phát hành thẻ cần thêm các nhánh điều hướng khách hàng có thể làm gì sau khi PHT (nhận hạn mức, thêm vào apple PAY, về trang chi tiết thẻ)
- Shop thẻ có các tab JCB Master Visa đang ko ổn (nhìn ko biết cái nào active cái nào ko)
- Thẻ JCB chưa add được G PAY`,
    status: 'Define',
    current_phase: '2. Define đầu bài',
    progress: 25,
    designer: 'Triết',
    email: 'trietnm1@mbbank.com.vn'
  },
  {
    stt: 2,
    squad: 'Card',
    product: 'App MBBank',
    title: 'Offer hạn mức tại trang pre-login',
    request_type: 'Kinh doanh',
    description: 'Đã tạo demo - Đang order kinh doanh gửi đầu bài APP',
    status: 'Define',
    current_phase: '2. Define đầu bài',
    progress: 25,
    designer: 'Triết',
    email: 'trietnm1@mbbank.com.vn'
  },
  {
    stt: 3,
    squad: 'Card',
    product: 'App MBBank',
    title: 'Bán chéo thẻ VETC',
    request_type: 'Kinh doanh',
    description: 'Đã chốt phương án - đang lên UI',
    status: 'Ready to dev',
    current_phase: '5. Ready to dev',
    progress: 85,
    designer: 'Triết',
    email: 'trietnm1@mbbank.com.vn'
  },
  {
    stt: 4,
    squad: 'Card',
    product: 'App MBBank',
    title: 'Thông tin người liên quan',
    request_type: 'Tuân thủ',
    description: 'Đã test UI, tuần này order sửa lại từ dev',
    status: 'Ready to Dev',
    current_phase: '5. Ready to dev',
    progress: 85,
    designer: 'Triết',
    email: 'trietnm1@mbbank.com.vn'
  },
  {
    stt: 5,
    squad: 'Card',
    product: 'App MBBank',
    title: 'Gia hạn thanh toán',
    request_type: 'Tính năng',
    description: 'Đang test UI, tuần này golive hoặc delay (chưa chắc đc)',
    status: 'UI Design',
    current_phase: '4. UI Design',
    progress: 70,
    designer: 'Triết',
    email: 'trietnm1@mbbank.com.vn'
  },
  {
    stt: 6,
    squad: 'Card',
    product: 'App MBBank',
    title: 'Thẻ liên kết tiền gửi',
    request_type: 'Kinh doanh',
    description: 'Đang chốt lại với bên tiền gửi',
    status: 'Wireframe',
    current_phase: '3. Wireframe',
    progress: 45,
    designer: 'Triết',
    email: 'trietnm1@mbbank.com.vn'
  },
  {
    stt: 7,
    squad: 'Card',
    product: 'App MBBank',
    title: 'Định danh thẻ HỘ KINH DOANH',
    request_type: 'Kinh doanh',
    description: 'Đang test UI',
    status: 'Ready to dev',
    current_phase: '5. Ready to dev',
    progress: 85,
    designer: 'Triết',
    email: 'trietnm1@mbbank.com.vn'
  },
  {
    stt: 8,
    squad: 'Lending',
    product: 'App MBBank',
    title: '[Vay BĐS] Đăng ký vay mua nhà dự án Bcons',
    request_type: 'Kinh doanh',
    description: '[Vay BĐS] Đăng ký vay mua nhà dự án Bcons',
    status: 'Wireframe',
    current_phase: '3. Wireframe',
    progress: 45,
    designer: 'Trang',
    email: 'trangbt9@mbbank.com.vn'
  },
  {
    stt: 9,
    squad: 'Lending',
    product: 'App MBBank',
    title: 'LD Vay linh hoạt',
    request_type: 'Kinh doanh',
    description: 'Đã confrim wf, đang làm UI',
    status: 'UI Design',
    current_phase: '4. UI Design',
    progress: 70,
    designer: 'Mạnh',
    email: 'manhpv.os@mbbank.com.vn'
  },
  {
    stt: 10,
    squad: 'Lending',
    product: 'App MBBank',
    title: '[General] Home Vay + Khoản vay của tôi',
    request_type: 'Kinh doanh',
    description: '[General] Home Vay + Khoản vay của tôi',
    status: 'UI Design',
    current_phase: '4. UI Design',
    progress: 70,
    designer: 'Trang',
    email: 'trangbt9@mbbank.com.vn'
  },
  {
    stt: 11,
    squad: 'Lending',
    product: 'App MBBank',
    title: '[Trạm sạc tài chính] Nhận HM khung',
    request_type: 'Kinh doanh',
    description: '[Trạm sạc tài chính] Nhận HM khung',
    status: 'Nghiệm thu UI',
    current_phase: '6. Nghiệm thu UI',
    progress: 95,
    designer: 'Trường',
    email: 'truongns@mbbank.com.vn'
  },
  {
    stt: 12,
    squad: 'Lending',
    product: 'App MBBank',
    title: 'Đặc quyền + Voucher Vay Tiêu dùng có TSDB/ BĐS',
    request_type: 'Kinh doanh',
    description: 'Đã gửi WF, chưa có lịch phát triển',
    status: 'Ready to dev',
    current_phase: '5. Ready to dev',
    progress: 85,
    designer: 'Trang',
    email: 'trangbt9@mbbank.com.vn'
  },
  {
    stt: 13,
    squad: 'Lending',
    product: 'App MBBank',
    title: '[Hoperun LOS Client] - Đánh giá trải nghiệm',
    request_type: 'Kinh doanh',
    description: 'Đánh giá trải nghiệm',
    status: 'Define',
    current_phase: '2. Define đầu bài',
    progress: 25,
    designer: 'Mạnh',
    email: 'manhpv.os@mbbank.com.vn'
  },
  {
    stt: 14,
    squad: 'Lending',
    product: 'App MBBank',
    title: 'Đồng bộ, cải tiến trải nghiệm toàn bộ sản phẩm vay',
    request_type: 'Đề xuất cải tiến',
    description: 'Rà soát đồng bộ luồng đăng ký, giải ngân, truy vấn',
    status: 'Define đầu bài',
    current_phase: '2. Define đầu bài',
    progress: 25,
    designer: 'Mạnh',
    email: 'manhpv.os@mbbank.com.vn'
  },
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function uploadTask(task) {
  const now = new Date();
  const rawObj = {
    title: task.title,
    product: task.product,
    product_name: task.product,
    preferred_squad: task.squad,
    squad_name: task.squad,
    request_type: task.request_type,
    description: task.description,
    business_need: task.description,
    user_problem: task.description,
    target_user: 'Khách hàng cá nhân App MBBank',
    expected_output: ['UI Design', 'Wireframe'],
    expected_deadline: '',
    release_date: '',
    status: task.status,
    current_phase: task.current_phase,
    progress: task.progress,
    priority: 'Lv3',
    assigned_designer: task.designer,
    assigned_designer_email: task.email,
    ux_owner: task.designer,
    requester_name: 'Dương Mạnh Cường',
    requester_email: 'cuongdm5@mbbank.com.vn',
    department: 'Khối Ngân hàng Số MB',
    client_environment: 'production',
    is_test: false,
    submitted_at: now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
    last_updated: now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
  };

  const payload = {
    action: 'log_request',
    client_environment: 'production',
    is_test: false,
    title: task.title,
    product: task.product,
    request_type: task.request_type,
    preferred_squad: task.squad,
    assigned_designer: task.designer,
    assigned_designer_email: task.email,
    requester_name: 'Dương Mạnh Cường',
    requester_email: 'cuongdm5@mbbank.com.vn',
    description: task.description,
    raw_data: rawObj,
  };

  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  return data;
}

async function run() {
  console.log('================================================================================');
  console.log('BẮT ĐẦU ĐẨY HÀNG LOẠT 14 BÀI TOÁN LÊN GOOGLE APPS SCRIPT / RAW_TASKS');
  console.log('================================================================================\n');

  const results = [];

  for (let i = 0; i < TASKS_DATA.length; i++) {
    const task = TASKS_DATA[i];
    process.stdout.write(`[${i + 1}/${TASKS_DATA.length}] Đang đẩy: "${task.title}" (${task.squad} - ${task.designer})... `);

    try {
      const resp = await uploadTask(task);
      if (resp && resp.status === 'success') {
        console.log(`✅ THÀNH CÔNG -> Mã: ${resp.request_id} (Dòng: ${resp.row || 'N/A'})`);
        results.push({
          stt: task.stt,
          id: resp.request_id,
          title: task.title,
          squad: task.squad,
          designer: task.designer,
          status: task.status,
          success: true
        });
      } else {
        console.log(`❌ THẤT BẠI: ${resp?.message || JSON.stringify(resp)}`);
        results.push({
          stt: task.stt,
          id: null,
          title: task.title,
          squad: task.squad,
          designer: task.designer,
          status: task.status,
          success: false,
          error: resp?.message
        });
      }
    } catch (err) {
      console.log(`❌ LỖI KẾT NỐI: ${err.message}`);
      results.push({
        stt: task.stt,
        id: null,
        title: task.title,
        squad: task.squad,
        designer: task.designer,
        status: task.status,
        success: false,
        error: err.message
      });
    }

    // Delay 1 giây giữa các request để chống lock contention trên Google Apps Script
    if (i < TASKS_DATA.length - 1) {
      await sleep(1000);
    }
  }

  console.log('\n================================================================================');
  console.log('TỔNG KẾT KẾT QUẢ ĐẨY DỮ LIỆU:');
  console.log(`Tổng số: ${TASKS_DATA.length} | Thành công: ${results.filter(r => r.success).length} | Lỗi: ${results.filter(r => !r.success).length}`);
  console.log('================================================================================');
  console.table(results);
}

run();
