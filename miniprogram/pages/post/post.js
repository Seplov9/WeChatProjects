const { regions } = require("../../data/regions");

function getCities(province) {
  const r = regions.find((r) => r.province === province);
  return r ? r.cities.map((c) => c.city) : ["全部"];
}

function getDistricts(province, city) {
  const r = regions.find((r) => r.province === province);
  if (!r) return ["全部"];
  const c = r.cities.find((c) => c.city === city);
  return c ? c.districts : ["全部"];
}

function buildProvinceOptions() {
  return ["全部城市"].concat(regions.map((r) => r.province));
}

Page({
  data: {
    onlineOptions: ["全部", "线上", "线下"],
    onlineIndex: 0,
    categoryOptions: [
      "全部品类",
      "家政保洁", "家教辅导", "陪同陪诊", "摄影拍摄",
      "代办跑腿", "搬家运输", "其他线下",
      "游戏陪玩", "线上教学", "咨询规划", "设计制作", "其他线上",
    ],
    categoryIndex: 0,
    provinceOptions: buildProvinceOptions(),
    provinceIndex: 0,
    cityOptions: ["全部"],
    cityIndex: 0,
    districtOptions: ["全部"],
    districtIndex: 0,
    title: "",
    content: "",
    reward: "",
    contact: "",
    images: [],
    editId: "",
  },

  onlineCategories: [
    "游戏陪玩", "线上教学", "咨询规划", "设计制作", "其他线上",
  ],
  offlineCategories: [
    "家政保洁", "家教辅导", "陪同陪诊", "摄影拍摄",
    "代办跑腿", "搬家运输", "其他线下",
  ],
  allCategoryOptions: [
    "全部品类",
    "家政保洁", "家教辅导", "陪同陪诊", "摄影拍摄",
    "代办跑腿", "搬家运输", "其他线下",
    "游戏陪玩", "线上教学", "咨询规划", "设计制作", "其他线上",
  ],

  onLoad(options) {
    if (options && options.orderId) {
      this.setData({ editId: options.orderId });
      this.loadOrder(options.orderId);
    }
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    const app = getApp();
    if (app.globalData.pendingEditId) {
      const id = app.globalData.pendingEditId;
      app.globalData.pendingEditId = null;
      this.setData({ editId: id });
      this.loadOrder(id);
    }
  },

  buildCategoryOptions(onlineIndex) {
    if (onlineIndex === 0) return this.allCategoryOptions;
    if (onlineIndex === 1) return ["全部品类"].concat(this.onlineCategories);
    return ["全部品类"].concat(this.offlineCategories);
  },

  // 解析存储的 city 字段恢复省/市/区选择
  parseCityField(cityStr) {
    if (!cityStr) return { provIdx: 0, cityIdx: 0, distIdx: 0, cityOpts: ["全部"], distOpts: ["全部"] };
    // 格式: "省·市·区" 或 "省" 或 "省·市"
    const parts = cityStr.split("·");
    const provName = parts[0] || "";
    const cityName = parts[1] || "";
    const distName = parts[2] || "";

    const provIdx = this.data.provinceOptions.indexOf(provName);
    const pIdx = provIdx >= 0 ? provIdx : 0;

    let cityOpts = ["全部"];
    let cityIdx = 0;
    if (pIdx > 0) {
      cityOpts = getCities(provName);
      cityIdx = cityOpts.indexOf(cityName);
      if (cityIdx < 0) cityIdx = 0;
    }

    let distOpts = ["全部"];
    let distIdx = 0;
    if (cityIdx > 0) {
      distOpts = getDistricts(provName, cityName);
      distIdx = distOpts.indexOf(distName);
      if (distIdx < 0) distIdx = 0;
    }

    return { provIdx: pIdx, cityIdx, distIdx, cityOpts, distOpts };
  },

  loadOrder(orderId) {
    wx.showLoading({ title: "加载中..." });
    wx.cloud.callFunction({
      name: "quickstartFunctions",
      data: { type: "getOrderById", orderId },
    }).then((resp) => {
      wx.hideLoading();
      if (resp.result.success) {
        const o = resp.result.data;
        let onlineIdx = 0;
        if (this.onlineCategories.includes(o.category)) onlineIdx = 1;
        else if (this.offlineCategories.includes(o.category)) onlineIdx = 2;
        const catOpts = this.buildCategoryOptions(onlineIdx);
        const catIdx = catOpts.indexOf(o.category);

        const loc = this.parseCityField(o.city || "");

        this.setData({
          onlineIndex: onlineIdx,
          categoryOptions: catOpts,
          categoryIndex: catIdx >= 0 ? catIdx : 0,
          provinceIndex: loc.provIdx,
          cityOptions: loc.cityOpts,
          cityIndex: loc.cityIdx,
          districtOptions: loc.distOpts,
          districtIndex: loc.distIdx,
          title: o.title || "",
          content: o.content || "",
          reward: String(o.reward || ""),
          contact: o.contact || "",
          images: o.images || [],
        });
      }
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: "加载失败", icon: "none" });
    });
  },

  onOnlineChange(e) {
    const idx = Number(e.detail.value);
    this.setData({
      onlineIndex: idx,
      categoryIndex: 0,
      categoryOptions: this.buildCategoryOptions(idx),
      provinceIndex: 0,
      cityOptions: ["全部"],
      cityIndex: 0,
      districtOptions: ["全部"],
      districtIndex: 0,
    });
  },

  onCategoryChange(e) {
    this.setData({ categoryIndex: Number(e.detail.value) });
  },

  onProvinceChange(e) {
    const idx = Number(e.detail.value);
    const province = this.data.provinceOptions[idx];
    const cityList = idx > 0 ? getCities(province) : ["全部"];
    const districtList = cityList.length > 1 ? getDistricts(province, cityList[1]) : ["全部"];
    this.setData({
      provinceIndex: idx,
      cityOptions: cityList,
      cityIndex: 0,
      districtOptions: districtList,
      districtIndex: 0,
    });
  },

  onCityChange(e) {
    const idx = Number(e.detail.value);
    const city = this.data.cityOptions[idx];
    const province = this.data.provinceOptions[this.data.provinceIndex];
    const districtList = idx > 0 ? getDistricts(province, city) : ["全部"];
    this.setData({
      cityIndex: idx,
      districtOptions: districtList,
      districtIndex: 0,
    });
  },

  onDistrictChange(e) {
    this.setData({ districtIndex: Number(e.detail.value) });
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  onRewardInput(e) {
    this.setData({ reward: e.detail.value });
  },

  onContactInput(e) {
    this.setData({ contact: e.detail.value });
  },

  onChooseImage() {
    wx.chooseMedia({
      count: 9 - this.data.images.length,
      mediaType: ["image"],
      sizeType: ["compressed"],
      success: (res) => {
        const files = res.tempFiles;
        wx.showLoading({ title: "上传中..." });
        const uploads = files.map((file) =>
          wx.cloud.uploadFile({
            cloudPath: "orders/" + Date.now() + "_" + Math.random().toString(36).slice(2, 8) + ".jpg",
            filePath: file.tempFilePath,
          })
        );
        Promise.all(uploads).then((results) => {
          wx.hideLoading();
          const newImages = results.map((r) => r.fileID);
          this.setData({ images: this.data.images.concat(newImages) });
        }).catch(() => {
          wx.hideLoading();
          wx.showToast({ title: "上传失败", icon: "none" });
        });
      },
    });
  },

  onDelImage(e) {
    const idx = e.currentTarget.dataset.index;
    const images = this.data.images.filter((_, i) => i !== idx);
    this.setData({ images });
  },

  cancelOrder() {
    const { editId } = this.data;
    if (!editId) return;
    wx.showModal({
      title: "确认撤销",
      content: "撤销后该需求将不再显示在信息池中，此操作不可恢复。",
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: "撤销中..." });
        wx.cloud.callFunction({
          name: "quickstartFunctions",
          data: { type: "cancelOrder", orderId: editId },
        }).then((resp) => {
          wx.hideLoading();
          if (resp.result.success) {
            wx.showToast({ title: "已撤销" });
            this.setData({
              editId: "",
              onlineIndex: 0,
              categoryOptions: this.allCategoryOptions,
              categoryIndex: 0,
              provinceIndex: 0,
              cityOptions: ["全部"],
              cityIndex: 0,
              districtOptions: ["全部"],
              districtIndex: 0,
              title: "",
              content: "",
              reward: "",
              contact: "",
              images: [],
            });
          } else {
            wx.showToast({ title: resp.result.errMsg || "操作失败", icon: "none" });
          }
        }).catch(() => {
          wx.hideLoading();
          wx.showToast({ title: "操作失败", icon: "none" });
        });
      },
    });
  },

  submitOrder() {
    const {
      onlineIndex,
      categoryOptions, categoryIndex,
      provinceOptions, provinceIndex,
      cityOptions, cityIndex,
      districtOptions, districtIndex,
      title, content, reward, contact, images, editId,
    } = this.data;

    if (onlineIndex === 0) {
      wx.showToast({ title: "请选择线上/线下", icon: "none" });
      return;
    }
    if (categoryIndex === 0) {
      wx.showToast({ title: "请选择品类", icon: "none" });
      return;
    }
    if (!title.trim()) {
      wx.showToast({ title: "请输入标题", icon: "none" });
      return;
    }
    if (!content.trim()) {
      wx.showToast({ title: "请输入内容", icon: "none" });
      return;
    }
    if (!reward || Number(reward) <= 0) {
      wx.showToast({ title: "请输入有效薪酬", icon: "none" });
      return;
    }
    if (!contact.trim()) {
      wx.showToast({ title: "请输入联系方式", icon: "none" });
      return;
    }

    // 组合省·市·区（城市可留空）
    let cityValue = "";
    if (provinceIndex > 0) {
      cityValue = provinceOptions[provinceIndex];
      if (cityIndex > 0) cityValue += "·" + cityOptions[cityIndex];
      if (districtIndex > 0) cityValue += "·" + districtOptions[districtIndex];
    }

    const userInfo = wx.getStorageSync("userInfo") || {};

    const cloudData = {
      category: categoryOptions[categoryIndex],
      title: title.trim(),
      content: content.trim(),
      reward: Number(reward),
      contact: contact.trim(),
      city: cityValue,
      images,
      publisherName: userInfo.nickName || "",
      publisherAvatar: userInfo.avatarUrl || "",
    };

    if (editId) {
      cloudData.type = "updateOrder";
      cloudData.orderId = editId;
    } else {
      cloudData.type = "createOrder";
    }

    wx.showLoading({ title: editId ? "更新中..." : "发布中..." });
    wx.cloud.callFunction({
      name: "quickstartFunctions",
      data: cloudData,
    }).then((resp) => {
      wx.hideLoading();
      if (resp.result.success) {
        wx.showToast({ title: editId ? "已更新" : "发布成功" });
        if (!editId) {
          this.setData({
            onlineIndex: 0,
            categoryOptions: this.allCategoryOptions,
            categoryIndex: 0,
            provinceIndex: 0,
            cityOptions: ["全部"],
            cityIndex: 0,
            districtOptions: ["全部"],
            districtIndex: 0,
            title: "",
            content: "",
            reward: "",
            contact: "",
            images: [],
          });
        }
      } else {
        wx.showToast({ title: resp.result.errMsg || "操作失败", icon: "none" });
      }
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: "操作失败", icon: "none" });
    });
  },
});
