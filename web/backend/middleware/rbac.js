// /**
//  * Role-Based Access Control (RBAC) Middleware
//  * Updated for PHYSICIAN_ASSISTANT role
//  */

// const jwt = require("jsonwebtoken");

// const JWT_SECRET = process.env.JWT_SECRET;

// /**
//  * Verify JWT token and attach user to req
//  */
// const verifyToken = (req, res, next) => {
//   if (!JWT_SECRET) {
//     console.error("❌ JWT_SECRET is missing in environment variables!");
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error: Security configuration missing",
//       debug: "JWT_SECRET missing"
//     });
//   }

//   let token;

//   // Try to get token from Authorization header first
//   if (
//     req.headers.authorization &&
//     req.headers.authorization.startsWith("Bearer ")
//   ) {
//     token = req.headers.authorization.slice(7); // Remove "Bearer " prefix
//   }
//   // Fall back to cookies if available
//   else if (req.cookies?.access_token) {
//     token = req.cookies.access_token;
//   }

//   if (!token) {
//     return res
//       .status(401)
//       .json({ success: false, message: "Unauthorized: No token provided" });
//   }

//   try {
//     const decoded = jwt.verify(token, JWT_SECRET);
//     if (!decoded || !decoded.id) {
//       return res
//         .status(403)
//         .json({
//           success: false,
//           message: "Forbidden: Malformed token payload",
//         });
//     }
//     req.user = decoded; // user contains id, role, email, etc.
//     console.log(
//       `[RBAC] Token verified for: ${req.user.email} (ID: ${req.user.id}, Role: ${req.user.role})`,
//     );
//     next();
//   } catch (err) {
//     console.warn(`[RBAC] JWT verification failed: ${err.message}`);
//     return res.status(401).json({
//       success: false,
//       message: "Unauthorized: Invalid or expired token",
//       error: err.message,
//       isExpired: err.name === "TokenExpiredError"
//     });
//   }
// };

// /**
//  * Check if user has one or more allowed roles
//  */
// const requireRole = (allowedRoles) => {
//   return (req, res, next) => {
//     if (!req.user) {
//       return res
//         .status(401)
//         .json({ success: false, message: "Unauthorized: Please log in first" });
//     }

//     if (!req.user.role) {
//       return res
//         .status(403)
//         .json({
//           success: false,
//           message: "Forbidden: User role not found in token",
//         });
//     }

//     const userRole = String(req.user.role).toUpperCase();
//     const rolesArray = (
//       Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
//     ).map((r) => String(r).toUpperCase());

//     if (!rolesArray.includes(userRole) && userRole !== "SUPERADMIN") {
//       return res.status(403).json({
//         success: false,
//         message: `Forbidden: This action requires one of: ${rolesArray.join(", ")}. You have ${userRole}`,
//       });
//     }

//     next();
//   };
// };

// /**
//  * Hierarchical permission check
//  */
// const requireHierarchy = (minRole) => {
//   const hierarchy = {
//     SUPERADMIN: 6,
//     ADMIN: 5,
//     DOCTOR: 4,
//     PHYSICIAN_ASSISTANT: 3, // Added PA
//     PATIENT: 2,
//     PHARMACY: 2,
//     SUPPORT: 1,
//   };

//   const minLevel = hierarchy[minRole] || 0;

//   return (req, res, next) => {
//     if (!req.user) {
//       return res
//         .status(401)
//         .json({ success: false, message: "Unauthorized: Token not verified" });
//     }

//     const userLevel = hierarchy[req.user.role] || 0;

//     if (userLevel < minLevel) {
//       return res.status(403).json({
//         success: false,
//         message: `Forbidden: Insufficient permissions (requires ${minRole})`,
//       });
//     }

//     next();
//   };
// };

// /**
//  * Owner verification
//  */
// const verifyOwnerOrAdmin = (req, res, next) => {
//   if (!req.user) {
//     return res.status(401).json({ success: false, message: "Unauthorized" });
//   }

//   const resourceId =
//     req.params.userId || req.params.patientId || req.params.doctorId;
//   const isOwner = req.user.id === resourceId;
//   const isAdmin = ["ADMIN", "SUPERADMIN"].includes(req.user.role);

//   if (!isOwner && !isAdmin) {
//     return res.status(403).json({
//       success: false,
//       message: "Forbidden: Cannot access other users' resources",
//     });
//   }

//   next();
// };

// /**
//  * Permission matrix
//  */
// const permissions = {
//   SUPERADMIN: { viewAllUsers: true, viewAllDoctors: true, manageAdmins: true },
//   ADMIN: { viewAllUsers: true, viewAllDoctors: true, manageAdmins: false },
//   DOCTOR: { viewOwnPatients: true, createPrescriptions: true, scheduleConsultations: true },
//   PHYSICIAN_ASSISTANT: {
//     viewAssignedPatients: true,
//     manageClinicalNotes: true,
//     handleRoutineConsultations: true
//   },
//   PATIENT: { viewOwnProfile: true, viewOwnAppointments: true },
//   PHARMACY: { viewOwnProfile: true, managePrescriptions: true },
//   SUPPORT: { viewTickets: true, respondToTickets: true },
// };

// const checkPermission = (permission) => {
//   return (req, res, next) => {
//     if (!req.user) {
//       return res.status(401).json({ success: false, message: "Unauthorized" });
//     }

//     const rolePerms = permissions[req.user.role] || {};

//     if (!rolePerms[permission]) {
//       return res.status(403).json({
//         success: false,
//         message: `Forbidden: Permission '${permission}' denied for ${req.user.role}`,
//       });
//     }

//     next();
//   };
// };

// module.exports = {
//   verifyToken,
//   requireRole,
//   requireHierarchy,
//   verifyOwnerOrAdmin,
//   checkPermission,
//   permissions,
// };

/**
 * Role-Based Access Control (RBAC) Middleware
 * Updated for PHYSICIAN_ASSISTANT role
 */

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Role Constants (recommended for consistency)
 */
const ROLES = {
  SUPERADMIN: "SUPERADMIN",
  ADMIN: "ADMIN",
  DOCTOR: "DOCTOR",
  PHYSICIAN_ASSISTANT: "PHYSICIAN_ASSISTANT",
  PATIENT: "PATIENT",
  PHARMACY: "PHARMACY",
  SUPPORT: "SUPPORT",
};

/**
 * Permissions Matrix
 */
const permissions = {
  SUPERADMIN: {
    viewAllUsers: true,
    viewAllDoctors: true,
    manageAdmins: true,
  },
  ADMIN: {
    viewAllUsers: true,
    viewAllDoctors: true,
    manageAdmins: false,
  },
  DOCTOR: {
    viewOwnPatients: true,
    createPrescriptions: true,
    scheduleConsultations: true,
  },
  PHYSICIAN_ASSISTANT: {
    viewAssignedPatients: true,
    manageClinicalNotes: true,
    handleRoutineConsultations: true,
  },
  PATIENT: {
    viewOwnProfile: true,
    viewOwnAppointments: true,
  },
  PHARMACY: {
    viewOwnProfile: true,
    managePrescriptions: true,
  },
  SUPPORT: {
    viewTickets: true,
    respondToTickets: true,
  },
};

/**
 * Verify JWT token and attach user to req
 */
const verifyToken = (req, res, next) => {
  if (!JWT_SECRET) {
    return res.status(500).json({
      success: false,
      message: "Internal server error: Security configuration missing",
    });
  }

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.slice(7);
  } else if (req.cookies?.access_token) {
    token = req.cookies.access_token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: No token provided",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded?.id || !decoded?.role) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Malformed token payload",
      });
    }

    req.user = decoded;

    console.log(
      `[RBAC] Verified user ID: ${req.user.id}, Role: ${req.user.role}`
    );

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or expired token",
      isExpired: err.name === "TokenExpiredError",
    });
  }
};

/**
 * Role-based access check
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Please log in first",
      });
    }

    const userRole = String(req.user.role).toUpperCase();
    const rolesArray = (Array.isArray(allowedRoles)
      ? allowedRoles
      : [allowedRoles]
    ).map((r) => String(r).toUpperCase());

    if (!rolesArray.includes(userRole) && userRole !== ROLES.SUPERADMIN) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Requires ${rolesArray.join(
          ", "
        )}. You have ${userRole}`,
      });
    }

    next();
  };
};

/**
 * Hierarchy-based access check
 */
const requireHierarchy = (minRole) => {
  const hierarchy = {
    SUPERADMIN: 6,
    ADMIN: 5,
    DOCTOR: 4,
    PHYSICIAN_ASSISTANT: 3,
    PATIENT: 2,
    PHARMACY: 2,
    SUPPORT: 1,
  };

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Token not verified",
      });
    }

    const userLevel = hierarchy[String(req.user.role).toUpperCase()] || 0;
    const minLevel = hierarchy[minRole] || 0;

    if (userLevel < minLevel) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Requires ${minRole} or higher`,
      });
    }

    next();
  };
};

/**
 * Owner OR Admin check
 */
const verifyOwnerOrAdmin = (idParam = "userId") => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const resourceId = req.params[idParam];
    const isOwner = req.user.id === resourceId;
    const isAdmin = [ROLES.ADMIN, ROLES.SUPERADMIN].includes(
      String(req.user.role).toUpperCase()
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Access denied",
      });
    }

    next();
  };
};

/**
 * Permission check
 */
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const roleKey = String(req.user.role).toUpperCase();
    const rolePerms = permissions[roleKey] || {};

    if (!rolePerms[permission]) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Missing permission '${permission}'`,
      });
    }

    next();
  };
};

module.exports = {
  verifyToken,
  requireRole,
  requireHierarchy,
  verifyOwnerOrAdmin,
  checkPermission,
  permissions,
  ROLES,
};