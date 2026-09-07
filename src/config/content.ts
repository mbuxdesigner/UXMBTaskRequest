/**
 * ==============================================================================
 * MB UX REQUEST PORTAL — MASTER CONTENT & COPYWRITING DICTIONARY
 * ==============================================================================
 * File này là NƠI TẬP TRUNG TOÀN BỘ CONTENT CỦA ỨNG DỤNG.
 * Khi cần thay đổi bất kỳ câu chữ nào trên giao diện (tiêu đề, nút bấm, mô tả,
 * placeholder, thông báo...), BẠN CHỈ CẦN CHỈNH SỬA TẠI FILE NÀY.
 * ==============================================================================
 */

export const APP_CONTENT = {
  // ----------------------------------------------------------------------------
  // 1. THÔNG TIN CHUNG & TOÀN CẦU (GLOBAL & COMMON)
  // ----------------------------------------------------------------------------
  common: {
    brand: {
      name: "MB UX Request Portal",
      shortName: "MB UX Portal",
      tagline: "Hệ thống tiếp nhận & Quản trị yêu cầu thiết kế trải nghiệm người dùng",
      department: "Digital Banking Division · MBBank",
    },
    buttons: {
      submit: "Gửi yêu cầu",
      cancel: "Hủy bỏ",
      save: "Thay đổi",
      delete: "Xóa",
      edit: "Chỉnh sửa",
      close: "Đóng",
      back: "Quay lại",
      confirm: "Xác nhận",
      retry: "Thử lại",
      search: "Tìm kiếm",
      filter: "Bộ lọc",
      reset: "Đặt lại",
      export: "Xuất file",
      import: "Nhập file",
      download: "Tải xuống",
      upload: "Tải lên",
      loading: "Đang xử lý...",
    },
    statusBadge: {
      all: "Tất cả",
      ready: "Sẵn sàng",
      normal: "Bình thường",
      busy: "Đang bận",
      overloaded: "Quá tải",
      inProgress: "Đang thực hiện",
      completed: "Hoàn thành",
      overdue: "Trễ hạn SLA",
      pending: "Pending",
    },
    priority: {
      high: "Lv1",
      medium: "Lv2",
      low: "Lv3",
    },
  },

  // ----------------------------------------------------------------------------
  // 2. ĐIỀU HƯỚNG SIDEBAR (NAVIGATION)
  // ----------------------------------------------------------------------------
  sidebar: {
    sections: {
      platform: "PLATFORM",
      resources: "RESOURCES",
    },
    navItems: {
      overview: {
        title: "Dashboard",
        description: "Overview Workload",
      },
      track: {
        title: "Track Task",
        description: "Kanban View",
      },
      create: {
        title: "Tạo task mới",
        description: "Task Submission",
      },
      manage: {
        title: "Quản trị",
        description: "System Configuration",
      },
      test: {
        title: "Test",
        description: "UX Assessment",
      },
      compressor: {
        title: "Compress Image",
        description: "Optimize Image Size",
      },
    },
    userMenu: {
      profileTitle: "Tài khoản của tôi",
      roleLabel: "Vai trò",
      logoutButton: "Đăng xuất",
      changeAvatar: "Đổi ảnh đại diện",
    },
  },

  // ----------------------------------------------------------------------------
  // 3. XÁC THỰC & ĐĂNG NHẬP (AUTH & OTP)
  // ----------------------------------------------------------------------------
  auth: {
    title: "Đăng nhập MB UX Portal",
    subtitle: "Xác thực tài khoản nội bộ qua Microsoft Teams hoặc chọn nhanh tài khoản Demo",
    teamsOtpCard: {
      title: "Xác thực bằng Microsoft Teams",
      emailLabel: "Địa chỉ Email Microsoft Teams",
      emailPlaceholder: "nhap_email@mbbank.com.vn",
      sendOtpButton: "Gửi mã xác thực qua Teams",
      otpLabel: "Mã xác thực 6 chữ số",
      otpPlaceholder: "000000",
      otpHelpText: "Mã OTP có hiệu lực trong 3 phút. Vui lòng kiểm tra chat Teams.",
      countdownText: "Mã hết hạn sau: ",
      resendButton: "Gửi lại mã",
      verifyButton: "Đăng nhập",
    },
    demoSection: {
      badge: "TRẢI NGHIỆM NHANH",
      title: "Đăng nhập nhanh với các vai trò Demo (1 Click):",
      roles: {
        admin: {
          title: "Admin",
          desc: "Full Access",
        },
        designOwner: {
          title: "Design Owner",
          desc: "Điều phối Squad & duyệt task",
        },
        designer: {
          title: "Designer",
          desc: "Cập nhật tiến độ & làm task",
        },
        po: {
          title: "PO",
          desc: "Gửi yêu cầu & theo dõi sản phẩm",
        },
      },
    },
  },

  // ----------------------------------------------------------------------------
  // 4. MÀN HÌNH TỔNG QUAN (OVERVIEW DASHBOARD)
  // ----------------------------------------------------------------------------
  overview: {
    pageTitle: "Tổng quan Năng lực & Tải việc UX",
    pageSubtitle: "Theo dõi chỉ số khối lượng công việc, hiệu suất và phân bổ nguồn lực toàn bộ Squad",
    kpi: {
      totalTasks: {
        label: "Tổng task",
        subtext: "Yêu cầu đã tiếp nhận",
      },
      inProgress: {
        label: "In Progress",
        subtext: "Đang triển khai thiết kế",
      },
      completed: {
        label: "Completed",
        subtext: "Đã bàn giao dev thành công",
      },
      overdue: {
        label: "Trễ hạn SLA",
        subtext: "Cần ưu tiên xử lý gấp",
      },
    },
    charts: {
      squadWorkloadTitle: "Khối lượng công việc theo UX Squad",
      squadWorkloadSubtitle: "Tỷ lệ tải việc thực tế so với hạn mức tối đa",
      productDistributionTitle: "Phân bổ bài toán theo Sản phẩm / Phân hệ",
      productDistributionSubtitle: "Số lượng yêu cầu phân loại theo các nghiệp vụ",
    },
    priorityQueue: {
      title: "Hàng đợi bài toán cần ưu tiên trong ngày",
      viewAll: "Xem tất cả trên Kanban",
    },
  },

  // ----------------------------------------------------------------------------
  // 5. MÀN HÌNH THEO DÕI YÊU CẦU & KANBAN (TRACK & KANBAN)
  // ----------------------------------------------------------------------------
  track: {
    pageTitle: "Track Task",
    pageSubtitle: "Theo dõi tiến độ và bàn giao sản phẩm",
    viewModes: {
      kanban: "Kanban",
      gantt: "Gantt",
      table: "Table",
      grid: "Grid",
      list: "List",
    },
    filter: {
      searchPlaceholder: "Tìm theo ID, tiêu đề, PO, Designer...",
      squadLabel: "UX Squad",
      allSquads: "All UX Squads",
      phaseLabel: "Phase",
      allPhases: "All Phases",
      priorityLabel: "Priority",
      allPriorities: "All Priorities",
      clearFilters: "Clear Filters",
      showingResults: "Showing {count} results",
    },
    emptyState: {
      title: "Không tìm thấy yêu cầu nào",
      description: "Hãy thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh lại các điều kiện lọc.",
      resetButton: "Đặt lại bộ lọc",
    },
    detailModal: {
      title: "Chi tiết yêu cầu",
      tabs: {
        general: "Thông tin chung",
        progress: "Tiến độ",
        business: "Mục tiêu kinh doanh",
        assignment: "Phân công nhân sự",
        deliverables: "Tài liệu bàn giao & Figma",
        history: "Nhật ký chuyển khâu",
      },
      labels: {
        requestId: "ID",
        taskTitle: "Tiêu đề",
        squad: "UX Squad",
        product: "Sản phẩm",
        requestType: "Loại yêu cầu",
        currentPhase: "Quy trình hiện tại",
        progressPercent: "Tiến độ hoàn thành",
        deadline: "Deadline",
        deadlineReason: "Lý do chọn hạn chót",
        poName: "PO",
        poEmail: "Email PO",
        assignedDesigner: "Designer",
        reviewer: "Design Owner",
        businessGoal: "Mục tiêu kinh doanh & Bài toán người dùng",
        figmaLink: "Figma",
        specLink: "Spec",
        attachments: "Attachments",
      },
      updateAction: {
        button: "Cập nhật tiến độ",
        phaseSelectLabel: "Quy trình:",
        progressSliderLabel: "Tiến độ:",
        noteLabel: "Action log:",
        notePlaceholder: "",
      },
      banners: {
        poWaiting: {
          title: "Đang chờ PO phản hồi",
          timeRemaining: "Còn {hours}h",
          description: "Designer đã gửi PO {sentTime}. Đang trong thời hạn chờ PO phản hồi. Sau 24h PO chưa phản hồi, task tự động chuyển sang trạng thái Pending.",
          buttons: {
            confirm: "Xác nhận",
            needUpdate: "Cần update",
          },
        },
        poPending: {
          title: "Trạng thái: PO Pending",
          badge: "Quá hạn 24h chưa phản hồi",
          descriptionWithTime: "Designer đã gửi PO {sentTime}. Đã quá 24h ({elapsedHours}h) chưa có phản hồi, task tự động chuyển trạng thái Pending.",
          descriptionFallback: "Designer đã gửi PO quá 24h chưa có phản hồi, task chuyển sang trạng thái Pending.",
          buttons: {
            confirm: "Xác nhận",
            needUpdate: "Cần update",
          },
        },
      },
    },
  },

  // ----------------------------------------------------------------------------
  // 6. MÀN HÌNH TẠO YÊU CẦU MỚI (CREATE REQUEST)
  // ----------------------------------------------------------------------------
  createRequest: {
    pageTitle: "Tạo yêu cầu thiết kế",
    pageSubtitle: "Điền đầy đủ thông tin đề bài để UX Squad tiếp nhận và xử lý nhanh chóng nhất",
    capacityWarning: "Lưu ý: Squad {squadName} hiện đang {status}, thời gian phản hồi có thể kéo dài hơn thường lệ.",
    form: {
      title: {
        label: "Tiêu đề yêu cầu",
        placeholder: "Ví dụ: Tối ưu luồng Đăng ký thẻ tín dụng online...",
        hint: "Đặt tên ngắn gọn, rõ ràng, phản ánh đúng tính năng cần làm",
      },
      product: {
        label: "Sản phẩm / Phân hệ nghiệp vụ",
        placeholder: "-- Chọn sản phẩm --",
        hintPo: "Bạn chỉ có quyền tạo yêu cầu cho các sản phẩm được phân công",
      },
      requestType: {
        label: "Phân loại yêu cầu",
        options: {
          new: "Thiết kế mới từ đầu",
          improvement: "Cải tiến trải nghiệm hiện tại",
          bugfix: "Sửa lỗi UI / Tinh chỉnh trải nghiệm",
          designSystem: "Đóng gói Component / Design System",
        },
      },
      squad: {
        label: "UX Squad tiếp nhận xử lý",
        placeholder: "-- Chọn UX Squad --",
      },
      deadline: {
        label: "Hạn chót mong muốn bàn giao",
        placeholder: "Chọn ngày hoàn thành",
      },
      deadlineReason: {
        label: "Lý do lựa chọn hạn chót này",
        placeholder: "Ví dụ: Khớp với Sprint 14 của đội Tech Dev, Kế hoạch ra mắt Q3/2026...",
      },
      businessGoal: {
        label: "Mục tiêu kinh doanh & Bài toán người dùng",
        placeholder: "Mô tả chi tiết vấn đề khách hàng đang gặp phải, chỉ số kỳ vọng (tăng conversion rate, giảm drop-off...)...",
      },
      expectedOutput: {
        label: "Đầu ra bàn giao mong đợi",
        options: {
          userFlow: "User Flow",
          wireframe: "Wireframe",
          hiFiUi: "Hi-Fi UI",
          prototype: "Prototype",
          designSpec: "Design Spec",
        },
      },
      attachments: {
        label: "Tài liệu đính kèm",
        uploadBoxText: "Kéo thả file vào đây hoặc bấm để chọn tệp",
        uploadSubtext: "Hỗ trợ PDF, Word, Excel, PNG, JPG (Tối đa 10MB). Tự động lưu lên Google Drive an toàn.",
        uploadedListTitle: "Tệp đính kèm đã tải lên:",
      },
      submitButton: "Gửi yêu cầu thiết kế",
    },
    successModal: {
      title: "Yêu cầu đã được gửi thành công!",
      subtitle: "ID:",
      message: "Hệ thống đã gửi thông báo đến UX Squad qua Microsoft Teams. Bạn có thể theo dõi tiến độ xử lý trên Track Task.",
      trackButton: "Theo dõi tiến độ",
      createNewButton: "Tạo yêu cầu mới",
    },
  },

  // ----------------------------------------------------------------------------
  // 7. MÀN HÌNH QUẢN TRỊ HỆ THỐNG (ADMIN SETTINGS & REUI APPLICATION SETTINGS)
  // ----------------------------------------------------------------------------
  manage: {
    pageTitle: "Quản trị Hệ thống & Cấu hình Cổng UX",
    pageSubtitle: "Trung tâm quản trị phân quyền nhân sự, quy trình khâu UX, danh mục nguồn và tích hợp",
    rolePreview: {
      label: "Xem trước dưới vai trò:",
      hint: "Đặc quyền Admin: Giả lập giao diện và quyền hạn của từng Role để kiểm tra hiển thị",
      reset: "Về Admin gốc",
      banner: "Đang xem thử giao diện dưới vai trò {role}. Bấm 'Về Admin gốc' để thoát chế độ xem thử.",
    },
    actions: {
      syncSheetDown: "Tải từ Sheet",
      syncSheetUp: "Đồng bộ lên Sheet",
      exportCsv: "Xuất CSV",
      addMember: "Thêm nhân sự",
      backupJson: "Sao lưu JSON",
      saveAll: "Lưu tất cả thay đổi",
    },
    tabs: {
      // 8 Tab chuẩn ReUI mới
      team: "Nhân sự & Phân bổ",
      rbac: "Phân quyền & Ma trận Menu",
      test_bank: "Quản lý Đề thi & Test UX",
      evaluation: "Đánh giá Hiệu suất",
      workflow: "Quy trình & Khâu UX",
      masterdata: "Master Data: Squads & Sản phẩm",
      integrations: "Tích hợp & Kết nối Ngoại vi",
      audit: "Nhật ký Quản trị & Audit Trail",

      // Legacy fallback
      usersAndNav: "1. Nhân sự & Phân quyền Menu",
      phases: "2. Quy trình Khâu UX & SLA",
      masterData: "3. Squads & Sản phẩm",
      auditLogs: "5. Nhật ký Kiểm toán",
    },
    teamTab: {
      title: "Danh sách Nhân sự & Phân bổ Đa-Squad",
      subtitle: "Quản lý danh sách thành viên UX, phân bổ Squad phụ trách, sản phẩm và hạn mức tải việc",
      searchPlaceholder: "Tìm tên, email, squad...",
      roleFilters: {
        all: "Tất cả",
        designer: "Designer",
        designOwner: "Design Owner",
        po: "PO",
        admin: "Admin",
      },
      counter: "Hiển thị {filtered} / {total} nhân sự",
      tableHeaders: {
        member: "Nhân sự",
        role: "Vai trò (Role)",
        squads: "Squads phụ trách",
        products: "Sản phẩm phân bổ (PO/Design)",
        workload: "Tải việc",
        canAssign: "Phân công",
        canApprove: "Duyệt đầu bài",
        canManage: "Quản trị",
        actions: "Thao tác",
      },
    },
    rbacTab: {
      title: "Phân quyền Vai trò & Ma trận Chức năng Hệ thống",
      subtitle: "Cấu hình quyền hạn tác nghiệp chi tiết cho từng nhóm người dùng (Admin, Design Owner, PO, Designer)",
      globalPermissionsTitle: "Quy chuẩn Quyền hạn Nghiệp vụ theo Vai trò (Global System Permissions)",
      menuMatrixTitle: "Ma trận Bật/Tắt & Thứ tự Menu Sidebar",
      menuMatrixHint: "Kéo thả hoặc bấm ⬆️/⬇️ để sắp xếp. Bật/Tắt công tắc switch để ẩn/hiện menu với từng Role.",
    },
    testBankTab: {
      title: "Quản lý Đề thi & Chấm bài Test UX",
      subtitle: "Soạn đề thi trắc nghiệm & tự luận, đồng bộ câu hỏi Excel và chấm điểm năng lực",
      gatewayBadge: "Excel + Google Sheet Gateway",
    },
    evaluationTab: {
      title: "Đánh giá Hiệu suất & Năng lực Nhân sự",
      subtitle: "Theo dõi KPI Matrix, chuẩn hóa chỉ số FTR (First-Time-Right) và tuân thủ SLA khâu",
      badge: "KPI Matrix MB v3.0",
      scorecard: {
        qualityIndex: {
          label: "Chỉ số Chất lượng TB",
          status: "⭐ Xuất sắc",
          desc: "Chuẩn hóa Design System MB",
        },
        onTimeSla: {
          label: "SLA Đúng hạn bàn giao",
          growth: "+4.2% MoM",
          desc: "Tỷ lệ nghiệm thu đúng hạn",
        },
        ftr: {
          label: "First-Time-Right (FTR)",
          status: "Ít sửa đổi",
          desc: "Duyệt ngay sau review 1",
        },
        activeMembers: {
          label: "Tổng nhân sự active",
          desc: "Phủ kín 6 UX Squads",
        },
      },
      matrixTitle: "Ma trận Năng lực & Đánh giá Hiệu suất Từng Nhân sự",
      matrixSubtitle: "Theo dõi tải trọng làm việc, điểm chất lượng nghiệm thu, tỷ lệ đúng hạn và năng lực chuyên môn của từng Designer/PO.",
      evaluateBtn: "Đánh giá",
    },
    workflowTab: {
      title: "Cấu hình Quy trình Khâu UX & Tiêu chuẩn SLA",
      subtitle: "Danh sách các khâu theo trình tự từ trên xuống dưới. Kéo thả hoặc bấm mũi tên ⬆️⬇️ để sắp xếp thứ tự, thêm khâu mới hoặc sửa SLA & tài liệu bàn giao.",
      addStepBtn: "Thêm bước mới",
      resetDefaultBtn: "Khôi phục mặc định",
      statusDictTitle: "Danh mục Trạng thái Bài toán (Đồng bộ Toàn hệ thống)",
      statusDictSubtitle: "Quy chuẩn 6 trạng thái nghiệp vụ đồng bộ trực tiếp giữa Chi tiết bài toán (Task Detail), Cột Kanban và Bộ đếm SLA",
      liveSyncBadge: "Live Sync",
      realtimeSyncNotice: "Mọi thay đổi về khâu quy trình UX bên trên sẽ tự động phản ánh trực tiếp vào Tiến trình 6 bước của Chi tiết bài toán và Cột bảng Kanban mà không cần cấu hình lại.",
    },
    masterdataTab: {
      title: "Danh mục Master Data: Squads & Sản phẩm",
      subtitle: "Quản lý các khối chuyên môn, phân hệ sản phẩm và trần hạn mức tiếp nhận đề bài",
      addSquadBtn: "Thêm Squad mới",
      addProductBtn: "Thêm Sản phẩm",
      squadsTitle: "Quản lý UX Squads & Hạn mức Tải việc",
      squadsSubtitle: "Cấu hình danh sách các Squad, hạn mức tải việc và Sản phẩm trực thuộc",
      productsTitle: "Danh mục Sản phẩm & Phân hệ (Products Catalog)",
      productsSubtitle: "Các sản phẩm số mà PO có thể chọn khi tạo yêu cầu đề bài UX",
    },
    integrationsTab: {
      title: "Tích hợp Cổng Kết nối Ngoại vi (APIs & Webhooks)",
      subtitle: "Quản lý kết nối cơ sở dữ liệu Google Sheets, lưu trữ Drive và Webhooks thông báo Teams",
      onlineBadge: "All Gateways Online",
      sheetsTitle: "Google Sheets Database Gateway",
      sheetsSubtitle: "Đồng bộ hai chiều dữ liệu bài toán UX",
      teamsTitle: "Microsoft Teams Notifications",
      teamsSubtitle: "Bắn thông báo realtime khi có đề bài mới hoặc bàn giao",
      testConnectionBtn: "Test kết nối",
      sendSampleBtn: "Gửi tin nhắn mẫu (Test Alert)",
    },
    auditTab: {
      title: "Nhật ký Quản trị & Audit Trail",
      subtitle: "Truy vết toàn bộ thao tác can thiệp hệ thống, thêm/sửa nhân sự và thay đổi SLA",
      exportJsonBtn: "Xuất JSON Log",
      tableTitle: "Nhật ký Quản trị Hệ thống (Admin Audit Trail)",
      tableSubtitle: "Ghi nhận toàn bộ thao tác thêm/sửa nhân sự, phân bổ Đa-Squad, thay đổi SLA và cài đặt",
    },
    modals: {
      editMember: {
        title: "Sửa Phân bổ & Phân quyền: {name}",
        avatarLabel: "Ảnh đại diện (Avatar):",
        nameLabel: "Họ và tên:",
        emailLabel: "Email Teams:",
        roleLabel: "Vai trò (Role):",
        statusLabel: "Trạng thái:",
        capacityLabel: "Hạn mức (Max task):",
        squadsLabel: "Phân bổ Squads phụ trách (Chọn nhiều Squad):",
        productsLabel: "Phân bổ Sản phẩm (PO gửi đề bài / Designer làm):",
        saveBtn: "Lưu cập nhật",
        cancelBtn: "Hủy",
      },
      addMember: {
        title: "Thêm nhân sự mới & Phân bổ Đa-Squad",
        submitBtn: "Thêm nhân sự",
      },
      editSquad: {
        title: "Sửa cấu hình Squad: {name}",
        saveBtn: "Lưu Squad",
      },
      addSquad: {
        title: "Thêm Squad mới",
        submitBtn: "Tạo Squad",
      },
      editPhase: {
        title: "Sửa Khâu UX: Bước {step} · {name}",
        saveBtn: "Lưu cấu hình Khâu",
      },
      addPhase: {
        title: "Thêm bước mới vào Quy trình UX",
        submitBtn: "Thêm vào quy trình",
      },
      addProduct: {
        title: "Thêm Sản phẩm / Phân hệ mới",
        submitBtn: "Thêm Sản phẩm",
      },
    },
  },

  // ----------------------------------------------------------------------------
  // 8. CÔNG CỤ NÉN ẢNH (IMAGE COMPRESSOR)
  // ----------------------------------------------------------------------------
  compressor: {
    modalTitle: "Công cụ Nén & Tối ưu Ảnh Chất lượng cao",
    modalSubtitle: "Xử lý trực tiếp trên trình duyệt bằng Canvas API · Bảo mật 100% không tải ảnh lên máy chủ",
    dropzoneText: "Kéo thả ảnh vào đây hoặc bấm để duyệt file",
    dropzoneSubtext: "Hỗ trợ PNG, JPG, JPEG, WebP",
    controls: {
      qualityLabel: "Mức chất lượng ảnh:",
      maxWidthLabel: "Chiều rộng tối đa (Max Width):",
      formatLabel: "Định dạng xuất:",
    },
    stats: {
      originalSize: "Dung lượng gốc:",
      compressedSize: "Sau khi nén:",
      savedRatio: "Tiết kiệm:",
    },
    buttons: {
      download: "Tải ảnh đã nén về máy",
      reset: "Chọn ảnh khác",
    },
  },
} as const

export type AppContent = typeof APP_CONTENT
