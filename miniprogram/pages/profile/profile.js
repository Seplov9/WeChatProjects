Page({
  data: {
    isLogin: false,
    displayName: "请登录",
    avatarUrl: "",
    nickName: "",
    showLoginPopup: false,
    agreed: false,
    tempAvatarUrl: "",
    tempNickName: "",
    showEditPopup: false,
    editAvatarUrl: "",
    editNickName: "",
  },

  onLoad() {
    const saved = wx.getStorageSync("userInfo");
    if (saved) {
      this.setData({
        isLogin: saved.isLogin,
        avatarUrl: saved.avatarUrl,
        nickName: saved.nickName,
        displayName: saved.displayName,
      });
    }
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
  },

  onProfileBoxTap() {
    if (!this.data.isLogin) {
      this.setData({
        showLoginPopup: true,
        agreed: false,
        tempAvatarUrl: "",
        tempNickName: "",
      });
    } else {
      this.setData({
        showEditPopup: true,
        editAvatarUrl: this.data.avatarUrl,
        editNickName: this.data.nickName,
      });
    }
  },

  // ========== 登录弹窗 ==========

  onHideLoginPopup() {
    this.setData({ showLoginPopup: false });
  },

  onChooseAvatar(e) {
    this.setData({ tempAvatarUrl: e.detail.avatarUrl });
  },

  onNicknameInput(e) {
    this.setData({ tempNickName: e.detail.value });
  },

  onConfirmTap() {
    if (!this.data.agreed) {
      wx.showToast({ title: "请先阅读并同意", icon: "none" });
    }
  },

  onToggleAgree() {
    this.setData({ agreed: !this.data.agreed });
  },

  onConfirmLogin() {
    if (!this.data.agreed) {
      wx.showToast({ title: "请先阅读并同意", icon: "none" });
      return;
    }
    if (!this.data.tempAvatarUrl || !this.data.tempNickName) {
      wx.showToast({ title: "请完善头像和昵称", icon: "none" });
      return;
    }
    wx.showLoading({ title: "登录中..." });
    wx.cloud
      .callFunction({
        name: "quickstartFunctions",
        data: {
          type: "saveUser",
          nickName: this.data.tempNickName,
          avatarUrl: this.data.tempAvatarUrl,
        },
      })
      .then((resp) => {
        wx.hideLoading();
        if (resp.result.success) {
          const userInfo = {
            isLogin: true,
            avatarUrl: this.data.tempAvatarUrl,
            nickName: this.data.tempNickName,
            displayName: this.data.tempNickName,
          };
          this.setData(Object.assign({ showLoginPopup: false }, userInfo));
          wx.setStorageSync("userInfo", userInfo);
          wx.showToast({ title: "登录成功" });
        } else {
          wx.showToast({ title: resp.result.errMsg || "登录失败", icon: "none" });
        }
      })
      .catch(() => {
        wx.hideLoading();
        wx.showToast({ title: "登录失败", icon: "none" });
      });
  },

  // ========== 修改资料弹窗 ==========

  onHideEditPopup() {
    this.setData({ showEditPopup: false });
  },

  onChooseEditAvatar(e) {
    this.setData({ editAvatarUrl: e.detail.avatarUrl });
  },

  onEditNicknameInput(e) {
    this.setData({ editNickName: e.detail.value });
  },

  onSaveProfile() {
    if (!this.data.editNickName) {
      wx.showToast({ title: "昵称不能为空", icon: "none" });
      return;
    }
    wx.showLoading({ title: "保存中..." });
    wx.cloud
      .callFunction({
        name: "quickstartFunctions",
        data: {
          type: "saveUser",
          nickName: this.data.editNickName,
          avatarUrl: this.data.editAvatarUrl,
        },
      })
      .then((resp) => {
        wx.hideLoading();
        if (resp.result.success) {
          const userInfo = {
            isLogin: true,
            avatarUrl: this.data.editAvatarUrl,
            nickName: this.data.editNickName,
            displayName: this.data.editNickName,
          };
          this.setData(Object.assign({ showEditPopup: false }, userInfo));
          wx.setStorageSync("userInfo", userInfo);
          wx.showToast({ title: "已保存" });
        } else {
          wx.showToast({ title: resp.result.errMsg || "保存失败", icon: "none" });
        }
      })
      .catch(() => {
        wx.hideLoading();
        wx.showToast({ title: "保存失败", icon: "none" });
      });
  },

  // ========== 退出登录 ==========

  onLogout() {
    wx.removeStorageSync("userInfo");
    this.setData({
      isLogin: false,
      displayName: "请登录",
      avatarUrl: "",
      nickName: "",
    });
  },
});
