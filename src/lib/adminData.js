import prisma from "@/lib/prisma";
import { SAFE_USER_SELECT } from "@/lib/auth";
import { isValidCategory } from "@/lib/categories";
import { extractPopularTags, parseTags } from "@/services/feedAlgorithm";

export async function getAdminOverviewData() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    suspendedUsers,
    totalPosts,
    pendingReports,
    resolvedReports,
    dismissedReports,
    pendingAppeals,
    blockedComments,
    todayPosts,
    todayUsers,
    todayBlockedComments,
    recentUsers,
    recentPosts,
    recentModerationLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isSuspended: true } }),
    prisma.post.count(),
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.report.count({ where: { status: "RESOLVED" } }),
    prisma.report.count({ where: { status: "DISMISSED" } }),
    prisma.appeal.count({ where: { status: "PENDING" } }),
    prisma.moderationLog.count(),
    prisma.post.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.moderationLog.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isSuspended: true,
        suspendedUntil: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.post.findMany({
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        imageFormat: true,
        warningCount: true,
        hasViolation: true,
        createdAt: true,
        author: {
          select: { username: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.moderationLog.findMany({
      include: {
        user: {
          select: { id: true, username: true, name: true },
        },
        post: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return {
    metrics: {
      totalUsers,
      suspendedUsers,
      totalPosts,
      pendingReports,
      resolvedReports,
      dismissedReports,
      pendingAppeals,
      blockedComments,
      todayPosts,
      todayUsers,
      todayBlockedComments,
    },
    recentUsers: recentUsers.map((item) => ({
      ...item,
      suspendedUntil: item.suspendedUntil
        ? item.suspendedUntil.toISOString()
        : null,
      createdAt: item.createdAt.toISOString(),
    })),
    recentPosts: recentPosts.map((post) => ({
      ...post,
      createdAt: post.createdAt.toISOString(),
    })),
    recentModerationLogs: recentModerationLogs.map((log) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    })),
  };
}

export async function getAdminContentsData({
  q = "",
  tag = "",
  category = "",
  reportedOnly = false,
} = {}) {
  const normalizedQuery = typeof q === "string" ? q.trim() : "";
  const normalizedTag =
    typeof tag === "string" ? tag.trim().toLowerCase().replace(/^#/, "") : "";
  const normalizedCategory =
    typeof category === "string" ? category.trim().toUpperCase() : "";

  const allTagRows = await prisma.post.findMany({ select: { tags: true } });
  const availableTags = extractPopularTags(allTagRows, 20);

  const where = {};

  if (isValidCategory(normalizedCategory)) {
    where.category = normalizedCategory;
  }

  if (reportedOnly) {
    where.reports = { some: {} };
  }

  if (normalizedQuery) {
    where.OR = [
      { title: { contains: normalizedQuery } },
      { caption: { contains: normalizedQuery } },
      { tags: { contains: normalizedQuery } },
      { author: { username: { contains: normalizedQuery } } },
      { author: { name: { contains: normalizedQuery } } },
    ];
  }

  const rawPosts = await prisma.post.findMany({
    where,
    include: {
      author: {
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
          bookmarks: true,
          reports: true,
        },
      },
      reports: {
        where: { status: "PENDING" },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const filteredPosts = normalizedTag
    ? rawPosts.filter((post) => parseTags(post.tags).includes(normalizedTag))
    : rawPosts;

  return {
    posts: filteredPosts.map(({ reports, ...post }) => ({
      ...post,
      publishedAt: post.publishedAt.toISOString(),
      createdAt: post.createdAt.toISOString(),
      pendingReportsCount: reports.length,
    })),
    availableTags,
  };
}

export async function getAdminUsersData({
  q = "",
  role = "",
  status = "",
} = {}) {
  const normalizedQuery = typeof q === "string" ? q.trim() : "";
  const normalizedRole =
    typeof role === "string" ? role.trim().toUpperCase() : "";
  const normalizedStatus =
    typeof status === "string" ? status.trim().toLowerCase() : "";

  const where = {};

  if (
    normalizedRole === "USER" ||
    normalizedRole === "MODERATOR" ||
    normalizedRole === "ADMIN"
  ) {
    where.role = normalizedRole;
  }

  if (normalizedStatus === "suspended") {
    where.isSuspended = true;
  } else if (normalizedStatus === "active") {
    where.isSuspended = false;
  }

  if (normalizedQuery) {
    where.OR = [
      { name: { contains: normalizedQuery } },
      { username: { contains: normalizedQuery } },
      { email: { contains: normalizedQuery } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      ...SAFE_USER_SELECT,
      _count: {
        select: {
          posts: true,
          comments: true,
          reports: true,
          followers: true,
          following: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    users: users.map((user) => ({
      ...user,
      suspendedUntil: user.suspendedUntil
        ? user.suspendedUntil.toISOString()
        : null,
      createdAt: user.createdAt.toISOString(),
    })),
  };
}

export async function getAdminReportsData({ status = "", q = "" } = {}) {
  const normalizedStatus =
    typeof status === "string" ? status.trim().toUpperCase() : "";
  const normalizedQuery = typeof q === "string" ? q.trim() : "";

  const where = {};

  if (
    normalizedStatus === "PENDING" ||
    normalizedStatus === "RESOLVED" ||
    normalizedStatus === "DISMISSED"
  ) {
    where.status = normalizedStatus;
  }

  if (normalizedQuery) {
    where.OR = [
      { reason: { contains: normalizedQuery } },
      { post: { title: { contains: normalizedQuery } } },
      { post: { author: { username: { contains: normalizedQuery } } } },
      { reporter: { username: { contains: normalizedQuery } } },
    ];
  }

  const [reports, total, pending, resolved, dismissed] = await Promise.all([
    prisma.report.findMany({
      where,
      include: {
        post: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            imageFormat: true,
            category: true,
            warningCount: true,
            hasViolation: true,
            author: {
              select: {
                id: true,
                username: true,
                name: true,
              },
            },
          },
        },
        reporter: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.report.count(),
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.report.count({ where: { status: "RESOLVED" } }),
    prisma.report.count({ where: { status: "DISMISSED" } }),
  ]);

  return {
    reports: reports.map((report) => ({
      ...report,
      createdAt: report.createdAt.toISOString(),
    })),
    counts: {
      total,
      pending,
      resolved,
      dismissed,
    },
  };
}

export async function getAdminModerationLogsData() {
  const logs = await prisma.moderationLog.findMany({
    include: {
      user: {
        select: { id: true, username: true, name: true },
      },
      post: {
        select: { id: true, title: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return {
    logs: logs.map((log) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    })),
  };
}

export async function getAdminAppealsData() {
  const appeals = await prisma.appeal.findMany({
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          isSuspended: true,
          suspendedUntil: true,
          suspensionReason: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return {
    appeals: appeals.map((item) => {
      let evidenceList = [];
      try {
        const parsed = JSON.parse(item.evidenceUrls || "[]");
        if (Array.isArray(parsed)) evidenceList = parsed;
      } catch {
        evidenceList = [];
      }
      return {
        ...item,
        evidenceList,
        createdAt: item.createdAt.toISOString(),
        reviewedAt: item.reviewedAt ? item.reviewedAt.toISOString() : null,
        user: {
          ...item.user,
          suspendedUntil: item.user.suspendedUntil
            ? item.user.suspendedUntil.toISOString()
            : null,
        },
      };
    }),
  };
}
