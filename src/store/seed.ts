// 初始台账样例（首次打开时写入本地，之后以 localStorage 为准）
import type { Delivery, Driver } from "../types";

export const seedDrivers: Driver[] = [
  {
    id: "seed-driver-1",
    name: "张建国",
    licenseNo: "A2-110203",
    qualificationNo: "WG-2018-0451",
    phone: "13800001111",
    status: "在聘",
    createdAt: "2026-06-20T08:00:00.000Z"
  },
  {
    id: "seed-driver-2",
    name: "李海涛",
    licenseNo: "A2-220311",
    qualificationNo: "WG-2019-0782",
    phone: "13800002222",
    status: "在聘",
    createdAt: "2026-06-21T08:00:00.000Z"
  },
  {
    id: "seed-driver-3",
    name: "王永强",
    licenseNo: "B2-330421",
    qualificationNo: "WG-2021-1033",
    phone: "13800003333",
    status: "停用",
    createdAt: "2026-06-22T08:00:00.000Z"
  }
];

export const seedDeliveries: Delivery[] = [
  {
    id: "seed-d-1",
    station: "城东站",
    fuel: "92号汽油",
    tons: 18,
    arriveAt: "2026-09-26",
    status: "待回单",
    notes: "车辆已到站，等待司机上报",
    driverId: "seed-driver-1",
    driverName: "张建国",
    createdAt: "2026-09-24T08:00:00.000Z",
    departedAt: "2026-09-25T07:20:00.000Z",
    receipt: {
      actualTons: 17.96,
      oilTemp: 24,
      sealState: "完整",
      sealNo: "FY-778821",
      reportedAt: "2026-09-26T09:02:00.000Z"
    }
  },
  {
    id: "seed-d-2",
    station: "机场站",
    fuel: "柴油",
    tons: 12,
    arriveAt: "2026-09-26",
    status: "运输中",
    notes: "已发车",
    driverId: "seed-driver-2",
    driverName: "李海涛",
    createdAt: "2026-09-24T09:00:00.000Z",
    departedAt: "2026-09-26T05:40:00.000Z"
  },
  {
    id: "seed-d-3",
    station: "新区站",
    fuel: "95号汽油",
    tons: 20,
    arriveAt: "2026-09-27",
    status: "待发车",
    notes: "等待装车",
    driverId: "seed-driver-1",
    driverName: "张建国",
    createdAt: "2026-09-25T10:00:00.000Z"
  },
  {
    id: "seed-d-4",
    station: "城东站",
    fuel: "柴油",
    tons: 25,
    arriveAt: "2026-09-25",
    status: "已退回",
    notes: "封签号与随车单不符，退回重报",
    driverId: "seed-driver-2",
    driverName: "李海涛",
    createdAt: "2026-09-23T10:00:00.000Z",
    departedAt: "2026-09-24T06:10:00.000Z",
    receipt: {
      actualTons: 24.6,
      oilTemp: 22,
      sealState: "破损",
      sealNo: "FY-665510",
      reportedAt: "2026-09-25T08:30:00.000Z"
    },
    returnedReason: "封签破损且与随车单编号不符，请核对后重新上报"
  },
  {
    id: "seed-d-5",
    station: "机场站",
    fuel: "92号汽油",
    tons: 16,
    arriveAt: "2026-09-24",
    status: "已到站",
    notes: "短装已挂差异，差异结清后归档",
    driverId: "seed-driver-2",
    driverName: "李海涛",
    createdAt: "2026-09-22T09:00:00.000Z",
    departedAt: "2026-09-23T06:00:00.000Z",
    receipt: {
      actualTons: 15.55,
      oilTemp: 26,
      sealState: "完整",
      sealNo: "FY-554402",
      reportedAt: "2026-09-24T09:10:00.000Z"
    },
    confirmation: {
      confirmedAt: "2026-09-24T09:40:00.000Z",
      officer: "值班员赵敏",
      finalTons: 15.55,
      note: "确认为短装，已生成差异单"
    }
  }
];
