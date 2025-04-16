// routes/friend.route.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST /api/friend/add
router.post('/add', async (req, res) => {
  const { friendEmail } = req.body;

  try {
    const user = await User.findOne({ email: friendEmail }); // Tìm người dùng qua email
    const friend = await User.findOne({ email: friendEmail });

    if (!user || !friend) {
      return res.status(404).json({ message: 'User or friend not found' });
    }

    if (user.friends.includes(friend._id)) {
      return res.status(400).json({ message: 'Already friends' });
    }

    user.friends.push(friend._id);
    await user.save();

    return res.status(200).json({ message: 'Friend added successfully' });
  } catch (error) {
    console.error('Error adding friend:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});


router.get('/requests', async (req, res) => {
  try {
    // Lấy danh sách yêu cầu kết bạn từ cơ sở dữ liệu mà không cần xác thực người dùng
    const users = await User.find().populate('friendRequests'); // Lấy tất cả người dùng và danh sách yêu cầu kết bạn của họ
    res.status(200).json(users); // Trả về danh sách yêu cầu kết bạn
  } catch (error) {
    console.error('Error getting friend requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



module.exports = router;
