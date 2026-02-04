import { RoomStatus, RoomType, BookingSource } from './types';

export type Language = 'en' | 'vi';

export const translations = {
  en: {
    dashboard: "Manager Dashboard",
    roomStatus: "Room Status",
    quickActions: "Quick Actions",
    newCheckIn: "New Check-In",
    roomOverview: "Room Overview",
    manageBookings: "Manage bookings, cleaning, and maintenance.",
    searchPlaceholder: "Search room or guest...",
    allStatus: "All Status",
    noRoomsFound: "No rooms found matching your criteria.",
    occupancy: "Occupancy",
    poweredBy: "Powered by Gemini AI",
    customizeLayout: "Customize Layout",
    views: {
      grid: "Dashboard",
      calendar: "Calendar",
      notes: "Notes"
    },
    notes: {
      title: "Shift Handover Notes",
      placeholder: "Record important events, handover instructions, or maintenance requests for this day...",
      saved: "Saved to local storage",
      typing: "Saving..."
    },
    status: {
      [RoomStatus.AVAILABLE]: "Available",
      [RoomStatus.OCCUPIED]: "Occupied",
      [RoomStatus.DIRTY]: "Dirty",
      [RoomStatus.MAINTENANCE]: "Maintenance",
      [RoomStatus.RESERVED]: "Reserved"
    },
    roomType: {
      [RoomType.SINGLE]: "Single",
      [RoomType.DOUBLE]: "Double",
      [RoomType.SUITE]: "Suite"
    },
    sources: {
      [BookingSource.BOOKING_COM]: "Booking.com",
      [BookingSource.AGODA]: "Agoda",
      [BookingSource.G2J]: "G2J",
      [BookingSource.WALK_IN]: "Walk-In",
      [BookingSource.OTHER]: "Other"
    },
    detail: {
      currentStatus: "Current Status",
      guestInfo: "Guest Information",
      hourly: "Hourly / Day Use",
      guestName: "Guest Name",
      enterGuestName: "Enter guest name...",
      bookingSource: "Booking Source",
      checkIn: "Check In",
      checkOut: "Check Out",
      selectTime: "Select Time",
      genWelcome: "Generate Welcome Note",
      maintenance: "Maintenance",
      issueDesc: "Issue Description",
      issuePlaceholder: "e.g., AC leaking water...",
      askAi: "Ask AI for Solution",
      config: "Room Configuration",
      roomName: "Room Name (Optional)",
      roomNumber: "Room Number",
      capacity: "Capacity",
      save: "Save Changes",
      checkOutBtn: "Check Out",
      kbtttLabel: "KBTTT Declaration (ID Scan)",
      kbtttDesc: "Guest ID/Passport scanned & recorded",
      salePrice: "Sale Price (VND)"
    },
    card: {
        in: "In",
        out: "Out",
        capacity: "Capacity",
        checkoutSoon: "Checkout Soon",
        overdue: "Overdue",
        kbtttOk: "KBTTT OK",
        kbtttMissing: "No KBTTT"
    },
    alerts: {
      title: "Attention Required",
      checkoutSoon: "rooms checkout soon",
      overdue: "rooms overdue",
      kbtttMissing: "guests missing KBTTT",
      placeholder: "No active alerts (Visible in edit mode)"
    },
    pettyCash: {
      title: "Petty Cash Box",
      balance: "Current Balance",
      add: "Add Entry",
      descPlaceholder: "e.g. Minibar Room 101",
      amount: "Amount",
      history: "Recent History",
      empty: "No transactions yet",
      income: "Income (+)",
      expense: "Expense (-)",
      delete: "Delete"
    },
    calendar: {
      today: "Today",
      prev: "Previous 14 Days",
      next: "Next 14 Days",
      jump: "Jump to date"
    }
  },
  vi: {
    dashboard: "Bảng quản lý",
    roomStatus: "Trạng thái phòng",
    quickActions: "Tác vụ nhanh",
    newCheckIn: "Nhận phòng mới",
    roomOverview: "Tổng quan phòng",
    manageBookings: "Quản lý đặt phòng, dọn dẹp và bảo trì.",
    searchPlaceholder: "Tìm phòng hoặc khách...",
    allStatus: "Tất cả trạng thái",
    noRoomsFound: "Không tìm thấy phòng phù hợp.",
    occupancy: "Công suất",
    poweredBy: "Được hỗ trợ bởi Gemini AI",
    customizeLayout: "Chỉnh sửa bố cục",
    views: {
      grid: "Lưới",
      calendar: "Lịch biểu",
      notes: "Ghi chú"
    },
    notes: {
      title: "Ghi chú giao ca",
      placeholder: "Ghi lại các sự kiện quan trọng, hướng dẫn bàn giao hoặc yêu cầu bảo trì cho ngày này...",
      saved: "Đã lưu vào bộ nhớ máy",
      typing: "Đang lưu..."
    },
    status: {
      [RoomStatus.AVAILABLE]: "Phòng trống",
      [RoomStatus.OCCUPIED]: "Có khách",
      [RoomStatus.DIRTY]: "Chưa dọn",
      [RoomStatus.MAINTENANCE]: "Bảo trì",
      [RoomStatus.RESERVED]: "Đã đặt"
    },
    roomType: {
      [RoomType.SINGLE]: "Phòng Đơn",
      [RoomType.DOUBLE]: "Phòng Đôi",
      [RoomType.SUITE]: "Phòng Suite"
    },
    sources: {
      [BookingSource.BOOKING_COM]: "Booking.com",
      [BookingSource.AGODA]: "Agoda",
      [BookingSource.G2J]: "G2J",
      [BookingSource.WALK_IN]: "Khách vãng lai",
      [BookingSource.OTHER]: "Khác"
    },
    detail: {
      currentStatus: "Trạng thái hiện tại",
      guestInfo: "Thông tin khách",
      hourly: "Theo giờ / Trong ngày",
      guestName: "Tên khách",
      enterGuestName: "Nhập tên khách...",
      bookingSource: "Nguồn đặt phòng",
      checkIn: "Nhận phòng",
      checkOut: "Trả phòng",
      selectTime: "Chọn giờ",
      genWelcome: "Tạo lời chào",
      maintenance: "Bảo trì",
      issueDesc: "Mô tả vấn đề",
      issuePlaceholder: "vd: Máy lạnh chảy nước...",
      askAi: "Hỏi AI giải pháp",
      config: "Cấu hình phòng",
      roomName: "Tên phòng (Tùy chọn)",
      roomNumber: "Số phòng",
      capacity: "Sức chứa",
      save: "Lưu thay đổi",
      checkOutBtn: "Trả phòng",
      kbtttLabel: "Khai báo tạm trú (KBTTT)",
      kbtttDesc: "Đã quét CCCD/Hộ chiếu khách",
      salePrice: "Giá bán (VND)"
    },
    card: {
        in: "Vào",
        out: "Ra",
        capacity: "Sức chứa",
        checkoutSoon: "Sắp trả phòng",
        overdue: "Quá giờ",
        kbtttOk: "Đã KBTTT",
        kbtttMissing: "Thiếu KBTTT"
    },
    alerts: {
      title: "Cần chú ý",
      checkoutSoon: "phòng sắp trả",
      overdue: "phòng quá giờ",
      kbtttMissing: "khách chưa KBTTT",
      placeholder: "Không có thông báo (Hiển thị khi chỉnh sửa)"
    },
    pettyCash: {
      title: "Két tiền mặt",
      balance: "Số dư hiện tại",
      add: "Thêm giao dịch",
      descPlaceholder: "vd: Minibar Phòng 101",
      amount: "Số tiền",
      history: "Lịch sử gần đây",
      empty: "Chưa có giao dịch",
      income: "Thu (+)",
      expense: "Chi (-)",
      delete: "Xóa"
    },
    calendar: {
      today: "Hôm nay",
      prev: "14 ngày trước",
      next: "14 ngày tới",
      jump: "Chọn ngày"
    }
  }
};