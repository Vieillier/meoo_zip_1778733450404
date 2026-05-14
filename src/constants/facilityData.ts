export interface FacilityItem {
  item: string;
  spec: string;
  unit: string;
  price: number;
  deposit: number;
}

export const FURNITURE_DATA: FacilityItem[] = [
  { item: '咨询台 info desk', spec: '1000l*500w*750h (mm)', unit: '个/期', price: 100, deposit: 0 },
  { item: '长桌 long table', spec: '1500l*500w*750h (mm)', unit: '个/期', price: 120, deposit: 0 },
  { item: '锁柜 lockable cabinet', spec: '1000l*500w*750h/1000h', unit: '个/期', price: 125, deposit: 0 },
  { item: '铝合金吧台 aluminum alloy bar', spec: '2000l*500w*750h (mm)', unit: '个/期', price: 700, deposit: 0 },
  { item: '水槽 basin', spec: '1000l*500w*750h (mm)', unit: '个/期', price: 780, deposit: 0 },
  { item: '玻璃高柜 tall glass showcase', spec: '500l/1000l * 2000h (mm)', unit: '个/期', price: 240, deposit: 0 },
  { item: '玻璃低柜 low glass showcase', spec: '1000l*500w*1000h (mm)', unit: '个/期', price: 250, deposit: 0 },
  { item: '货架 rack', spec: '1000l*500w*2000h (mm)', unit: '个/期', price: 240, deposit: 0 },
  { item: '沙发 sofa', spec: '600l*900w*330h (mm)', unit: '个/期', price: 250, deposit: 0 },
  { item: '靠背椅 backrest chair', spec: '460l*460w*450h (mm)', unit: '把/期', price: 60, deposit: 0 },
  { item: '吧椅 bar stool', spec: '530l*530w*870h (mm)', unit: '把/期', price: 90, deposit: 0 },
  { item: '塑料折椅 folding chair', spec: '460l*460w*490h (mm)', unit: '把/期', price: 30, deposit: 0 },
  { item: '电脑 computer', spec: '-', unit: '台/期', price: 500, deposit: 0 },
  { item: '电冰箱 refrigerator', spec: '120l', unit: '个/期', price: 1200, deposit: 0 },
  { item: '电冰柜 freezer', spec: '200l', unit: '个/期', price: 1500, deposit: 0 },
  { item: '插座 500w socket', spec: '500w', unit: '个/期', price: 65, deposit: 0 },
  { item: '太阳灯 sun lamp', spec: '100w/300w/500w', unit: '个/期', price: 80, deposit: 0 },
  { item: '易拉宝 roll-up banner', spec: '800l*1800h (含喷绘)', unit: '个/期', price: 150, deposit: 0 },
  { item: '阻燃地毯 fire-retardant carpet', spec: '-', unit: 'm2/期', price: 10, deposit: 0 },
  { item: '舞台 stage', spec: '高度 (40.60.80)', unit: 'm2/期', price: 100, deposit: 0 },
  { item: '平板车 hand truck', spec: '1200l*800w (mm)', unit: '每小时', price: 25, deposit: 0 },
];

export const NETWORK_DATA: FacilityItem[] = [
  { item: '市内直线', spec: '-', unit: '条/期', price: 900, deposit: 0 },
  { item: '国内直线', spec: '-', unit: '条/期', price: 1200, deposit: 1000 },
  { item: '国际直线', spec: '-', unit: '条/期', price: 3450, deposit: 4000 },
  { item: '10m 专线', spec: '-', unit: '条/期', price: 7800, deposit: 0 },
  { item: '15m 专线', spec: '-', unit: '条/期', price: 13000, deposit: 0 },
  { item: '30m 专线', spec: '-', unit: '条/期', price: 19500, deposit: 0 },
  { item: '40m 专线', spec: '-', unit: '条/期', price: 26000, deposit: 0 },
  { item: '60m 专线', spec: '-', unit: '条/期', price: 32500, deposit: 0 },
  { item: '100m 专线', spec: '-', unit: '条/期', price: 78000, deposit: 0 },
];

export const ELECTRICITY_DATA: FacilityItem[] = [
  { item: '照明电箱 15a/380v lighting', spec: '15a/380v', unit: '个', price: 1910, deposit: 0 },
  { item: '照明电箱 30a/380v lighting', spec: '30a/380v', unit: '个', price: 2940, deposit: 0 },
  { item: '照明电箱 60a/380v lighting', spec: '60a/380v', unit: '个', price: 4960, deposit: 0 },
  { item: '照明电箱 100a/380v lighting', spec: '100a/380v', unit: '个', price: 8050, deposit: 0 },
  { item: '照明电箱 150a/380v lighting', spec: '150a/380v', unit: '个', price: 11970, deposit: 0 },
  { item: '照明电箱 200a/380v lighting', spec: '200a/380v', unit: '个', price: 17920, deposit: 0 },
  { item: '照明电箱 250a/380v lighting', spec: '250a/380v', unit: '个', price: 22360, deposit: 0 },
  { item: '照明电箱 300a/380v lighting', spec: '300a/380v', unit: '个', price: 25200, deposit: 0 },
  { item: '机械电箱 15a/380v machine', spec: '15a/380v', unit: '个', price: 1910, deposit: 0 },
  { item: '机械电箱 30a/380v machine', spec: '30a/380v', unit: '个', price: 2940, deposit: 0 },
  { item: '机械电箱 60a/380v machine', spec: '60a/380v', unit: '个', price: 4960, deposit: 0 },
  { item: '机械电箱 100a/380v machine', spec: '100a/380v', unit: '个', price: 8050, deposit: 0 },
  { item: '机械电箱 150a/380v machine', spec: '150a/380v', unit: '个', price: 11970, deposit: 0 },
  { item: '机械电箱 200a/380v machine', spec: '200a/380v', unit: '个', price: 17920, deposit: 0 },
  { item: '机械电箱 250a/380v machine', spec: '250a/380v', unit: '个', price: 22360, deposit: 0 },
  { item: '机械电箱 300a/380v machine', spec: '300a/380v', unit: '个', price: 25200, deposit: 0 },
];

export const WATER_DATA: FacilityItem[] = [
  { item: '展台用水 dn15mm booth water', spec: '展台用水dn15mm', unit: '处', price: 3120, deposit: 0 },
  { item: '机器用水 dn20mm machine water', spec: '机器用水dn20mm', unit: '处', price: 4680, deposit: 0 },
];

export const GAS_DATA: FacilityItem[] = [
  { item: '空压机air-compressor <=0.4m3/min', spec: '<=0.4立方/分,dn15,8bar', unit: '点', price: 3900, deposit: 0 },
  { item: '空压机air-compressor <=0.9m3/min', spec: '<=0.9立方/分,dn20,8bar', unit: '点', price: 4550, deposit: 0 },
  { item: '空压机air-compressor >=1.0m3/min', spec: '>=1.0立方/分,dn25,8bar', unit: '点', price: 5200, deposit: 0 },
];

export const CATEGORY_LABELS: Record<string, string> = {
  furniture: '展具',
  network: '网点',
  electricity: '用电',
  water: '用水',
  gas: '用气',
};

export interface ApplicationItem {
  item: string;
  spec: string;
  unit: string;
  price: number;
  deposit: number;
  quantity: number;
}

export interface ApplicationData {
  category: string;
  items: ApplicationItem[];
  confirmed: boolean;
}
