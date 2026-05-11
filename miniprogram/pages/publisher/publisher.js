Page({
  data: {
    publisherId: "",
    name: "",
    avatar: "",
    orders: [],
    loading: true,
  },

  onLoad(options) {
    if (!options || !options.publisherId) {
      wx.showToast({ title: "参数错误", icon: "none" });
      wx.navigateBack();
      return;
    }

    this.setData({
      publisherId: options.publisherId,
      name: decodeURIComponent(options.publisherName || ""),
      avatar: decodeURIComponent(options.publisherAvatar || ""),
    });

    wx.setNavigationBarTitle({ title: this.data.name || "发布者" });
    this.fetchOrders();
  },

  formatTime(date) {
    if (!date) return "";
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  fetchOrders() {
    wx.showLoading({ title: "加载中..." });
    wx.cloud
      .callFunction({
        name: "quickstartFunctions",
        data: {
          type: "getPublisherOrders",
          publisherId: this.data.publisherId,
        },
      })
      .then((resp) => {
        wx.hideLoading();
        if (resp.result.success) {
          const orders = resp.result.data.map((item) => ({
            ...item,
            createdAt: this.formatTime(item.createdAt),
          }));
          this.setData({ orders, loading: false });
        } else {
          this.setData({ loading: false });
          wx.showToast({ title: "加载失败", icon: "none" });
        }
      })
      .catch((err) => {
        wx.hideLoading();
        this.setData({ loading: false });
        console.error("getPublisherOrders 失败", err);
        wx.showToast({ title: "加载失败", icon: "none" });
      });
  },

  onCardTap(e) {
    const item = this.data.orders[e.currentTarget.dataset.index];
    if (!item || !item._id) return;
    wx.navigateTo({ url: "/pages/show/show?orderId=" + item._id });
  },
});
