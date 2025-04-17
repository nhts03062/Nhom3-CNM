const User = require('../models/User');
const UserUtil = require('../utils/user-util')

const searchController ={}

searchController.getUserByEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ msg: 'Thiếu email trong query' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ msg: 'Không tìm thấy người dùng' });
    }

    return res.status(200).json({
      user: UserUtil.locUserRaIdNameAvatarRequestFriendFriend(user), //
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ msg: 'Lỗi khi tìm user theo email' });
  }
};

module.exports = searchController