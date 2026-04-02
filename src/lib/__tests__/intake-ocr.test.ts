import { parseIncomingParcelOcr } from "@/lib/intake-ocr";

describe("intake OCR parser", () => {
  it("extracts key fields from a Chinese warehouse label", () => {
    const result = parseIncomingParcelOcr(
      "",
      `
        壹米滴答 寄件人存根联 95058 yimidida.com
        112731802198
        承运网点: 绯湖众力营业部 13660857987
        到达网点: 市区惠福营业部 8520159327
        收件人: EXP
        18578717113
        广东省广州市越秀区珠光街道万福路140-1号ID 3421LTOKY
        寄付款: 22.0
        代收货款: 0
        货物: 汽配
        保价: 1000.00
        件数: 1
        重量/体积: 7.00KG / 0.02M3
        服务方式: 派送
      `,
    );

    expect(result.courierCompany).toBe("Yimidida");
    expect(result.chinaTrackingNumber).toBe("112731802198");
    expect(result.scanValue).toBe("112731802198");
    expect(result.receiverNameRaw).toBe("EXP");
    expect(result.receiverPhoneRaw).toBe("18578717113");
    expect(result.receiverAddressRaw).toContain("3421LTOKY");
    expect(result.declaredValue).toBe(1000);
    expect(result.actualWeightKg).toBe(7);
    expect(result.suggestedNotes).toContain("Goods: 汽配");
  });

  it("handles noisy OCR from a real Chinese label photo", () => {
    const result = parseIncomingParcelOcr(
      "",
      `abel]

Ne =xmz=
Ae 寄 件 人 存根 联 ©95058
 [EyrEAE yimidida.com |
[5 :
= TR
i fas 0°; 112731802198 i
I FER SME 1ssa0ssree I
I 到 达 网 点 :市 区 惠 福 营业 部 日 8520159327
, 收 件 人 :EXP BHA ETE i
i 18578711713 15920186648 ;
, 广东 人 沼 广 州 市 越秀 区 ,珠光 街道 万 福 路 140-1SID I
I 3421CfoKY I
EEm220 [服务 方式 派送 i
;到 付款 : 是 否 上 楼 :
I, 代 收 货款 :0 I 等 回 香 :
I 货物: 汽 盏 EC :
, 保价 : 1000.00 重量 /体积 :7.00KG / 0.02Ms`,
    );

    expect(result.courierCompany).toBe("Yimidida");
    expect(result.chinaTrackingNumber).toBe("112731802198");
    expect(result.receiverNameRaw).toBe("EXP");
    expect(result.receiverPhoneRaw).toBe("18578711713");
    expect(result.receiverAddressRaw).toContain("万福路");
    expect(result.receiverAddressRaw).toContain("3421CfoKY");
    expect(result.declaredValue).toBe(1000);
    expect(result.actualWeightKg).toBe(7);
  });

  it("extracts tracking, customer code, and weight from a parcel-bag label style", () => {
    const result = parseIncomingParcelOcr(
      "",
      `
        极兔速递
        510 U704-00 099
        JT3155071032658
        湖北省武汉市洪山区湖北省武汉市洪山区雄楚. 汉理工大学南湖校区9号楼留学生公寓EXP3166
        计件重量 0.21kg
      `,
    );

    expect(result.courierCompany).toBe("J&T Express");
    expect(result.chinaTrackingNumber).toBe("JT3155071032658");
    expect(result.detectedCustomerCode).toBe("EXP3166");
    expect(result.receiverAddressRaw).toContain("EXP3166");
    expect(result.actualWeightKg).toBe(0.21);
  });

  it("normalizes common OCR confusion on J&T tracking labels", () => {
    const result = parseIncomingParcelOcr(
      "",
      `
        极兔速递
        510 U704-00 099
        IT3155071032658
        湖北省武汉市洪山区洪山街道南湖校区学生公寓EXP3166
        计件重量: 0.21kg
      `,
    );

    expect(result.courierCompany).toBe("J&T Express");
    expect(result.chinaTrackingNumber).toBe("JT3155071032658");
    expect(result.detectedCustomerCode).toBe("EXP3166");
    expect(result.actualWeightKg).toBe(0.21);
  });

  it("extracts tracking and receiver phone from a taller J&T label layout", () => {
    const result = parseIncomingParcelOcr(
      "",
      `
        J&T 标准快递
        510 U704-00 099
        JT5462439201446
        鄂州葛店转运中心
        武汉理工大学|LG
        隐私号码 18400949454转0867
        R* ******1738
        湖北省武汉市洪山区珞狮大道268号武汉理工大学南湖校区9号楼留学生公寓 EXP
      `,
    );

    expect(result.courierCompany).toBe("J&T Express");
    expect(result.chinaTrackingNumber).toBe("JT5462439201446");
    expect(result.receiverPhoneRaw).toBe("18400949454");
    expect(result.receiverAddressRaw).toContain("留学生公寓");
    expect(result.trackingCandidates.some((candidate) => candidate.value === "U70400099")).toBe(
      true,
    );
  });

  it("prefers the tracking number printed under a barcode on a YTO-style label", () => {
    const result = parseIncomingParcelOcr(
      "",
      `
        圆通速递
        600-H18-00 13
        YT7575143069923
        SEA 18578711713
        广东省广州市越秀区万福路140-1号 IE-3421LTOKY
      `,
    );

    expect(result.courierCompany).toBe("YTO");
    expect(result.chinaTrackingNumber).toBe("YT7575143069923");
    expect(result.receiverPhoneRaw).toBe("18578711713");
    expect(result.receiverAddressRaw).toContain("IE-3421LTOKY");
    expect(
      result.trackingCandidates.some(
        (candidate) => candidate.kind === "route_code" && candidate.value.startsWith("600-H18"),
      ),
    ).toBe(true);
  });
});
