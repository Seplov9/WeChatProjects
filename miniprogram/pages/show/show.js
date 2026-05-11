Page({
  data: {
    order: null,
  },

  onLoad(options) {
    if (options && options.orderId) {
      this.loadOrder(options.orderId);
    }
  },

  loadOrder(orderId) {
    wx.showLoading({ title: "加载中..." });
    wx.cloud
      .callFunction({
        name: "quickstartFunctions",
        data: { type: "getOrderById", orderId },
      })
      .then((resp) => {
        wx.hideLoading();
        if (resp.result.success) {
          const o = resp.result.data;
          o.createdAt = this.formatTime(o.createdAt);
          this.setData({ order: o });
        } else {
          wx.showToast({ title: "加载失败", icon: "none" });
        }
      })
      .catch(() => {
        wx.hideLoading();
        wx.showToast({ title: "加载失败", icon: "none" });
      });
  },

  formatTime(date) {
    if (!date) return "";
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    const urls = this.data.order.images || [];
    wx.previewImage({ current: url, urls });
  },

  onTapPublisher() {
    const o = this.data.order;
    if (!o || !o.publisherId) return;
    wx.navigateTo({
      url: `/pages/publisher/publisher?publisherId=${o.publisherId}&publisherName=${encodeURIComponent(o.publisherName || '')}&publisherAvatar=${encodeURIComponent(o.publisherAvatar || '')}`,
    });
  },
});
