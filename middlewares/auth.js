const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Constants
const ADMIN_ROLES = ['admin', 'systemAdmin'];
const TOKEN_TYPES = {
    ACCESS: 'ACCESS',
    REFRESH: 'REFRESH'
};

const generateToken = (user) => {
    const accessToken = jwt.sign(
        {
            userId: user._id,
            email: user.email,
            role: user.role,
            type: TOKEN_TYPES.ACCESS
        },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
        { 
            userId: user._id,
            type: TOKEN_TYPES.REFRESH
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '1d' }
    );

    return { accessToken, refreshToken };
};

const verifyAccessToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        // Check if Authorization header exists and has correct format
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                message: 'Valid Bearer token is required' 
            });
        }

        const token = authHeader.split(' ')[1];

        // Check if token is provided
        if (!token || token.trim() === '') {
            return res.status(401).json({ 
                message: 'Access token is required' 
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        // Verify token type
        if (decoded.type !== TOKEN_TYPES.ACCESS) {
            return res.status(401).json({ 
                message: 'Invalid token type' 
            });
        }

        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                message: 'Token has expired' 
            });
        }
        console.error('Token verification error:', error);
        return res.status(403).json({
            message: 'Invalid token',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                message: 'Authentication required' 
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Access denied. Required roles: ${roles.join(', ')}` 
            });
        }

        next();
    };
};

const refreshTokenMiddleware = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        // Check if refresh token is provided
        if (!refreshToken || refreshToken.trim() === '') {
            return res.status(401).json({ 
                message: 'Refresh token is required' 
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // Verify token type
        if (decoded.type !== TOKEN_TYPES.REFRESH) {
            return res.status(401).json({ 
                message: 'Invalid token type' 
            });
        }

        // Find user and verify refresh token
        const user = await User.findById(decoded.userId);
        if (!user || user.refreshToken !== refreshToken) {
            return res.status(403).json({ 
                message: 'Invalid refresh token' 
            });
        }

        // Check if user is still active
        if (!user.isActive) {
            return res.status(403).json({ 
                message: 'User account is inactive' 
            });
        }

        // Generate new tokens
        const tokens = generateToken(user);
        
        // Update refresh token in database
        user.refreshToken = tokens.refreshToken;
        await user.save();

        req.tokens = tokens;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                message: 'Refresh token has expired' 
            });
        }
        console.error('Refresh token error:', error);
        return res.status(403).json({ 
            message: 'Invalid refresh token',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const checkAdminPermission = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            message: 'Authentication required' 
        });
    }

    if (!ADMIN_ROLES.includes(req.user.role)) {
        return res.status(403).json({ 
            message: 'Only admin and system admin can perform this action' 
        });
    }
    
    next();
};

module.exports = {
    generateToken,
    verifyAccessToken,
    checkRole,
    refreshTokenMiddleware,
    checkAdminPermission,
    ADMIN_ROLES,
};