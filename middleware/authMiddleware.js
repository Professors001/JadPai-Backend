const jwt = require('jsonwebtoken');

exports.isAdmin = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authorization token is required.' });
        }
        const token = authHeader.split(' ')[1];
        const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);
        //Already Check Token is Expired or Not

        if (decodedPayload.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admin access required.' });
        }
        
        // If everything is okay, proceed to the next function (the controller)
        next(); 
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

exports.isAuthenticated = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authorization token is required.' });
        }

        const token = authHeader.split(' ')[1];
        const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);
        //Already Check Token is Expired or Not

        // ✨ Attach the decoded user payload to the request object
        req.user = decodedPayload;

        // Proceed to the controller function
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};