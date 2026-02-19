import DefaultAppImage from "../../../assets/images/logo.png";

const ADMIN_ASSET_BASE_URL = "https://admin.kloow.com";

export function getItemTitle(item) {
  return item?.title || item?.description || "";
}

export function getItemImg(item) {
  return item?.logoPath
    ? `${ADMIN_ASSET_BASE_URL}/${item.logoPath}`
    : DefaultAppImage;
}

export function getThumbImg(item, fallbackImage) {
  if (item?.thumbPath) {
    return `${ADMIN_ASSET_BASE_URL}${item.thumbPath}`;
  }
  return fallbackImage;
}

export function buildInitialRunningStatus(appList) {
  if (!Array.isArray(appList)) return {};
  return appList.reduce((acc, app) => {
    acc[app.id] = false;
    return acc;
  }, {});
}

export function buildInitialServerSelection(appList) {
  if (!Array.isArray(appList)) return {};
  return appList.reduce((acc, app) => {
    if (app?.servers?.length > 0) {
      acc[app.id] = app.servers[0];
    }
    return acc;
  }, {});
}

export function mapHealthStatuses(healthStatuses) {
  if (!healthStatuses || typeof healthStatuses !== "object") return {};
  return Object.keys(healthStatuses).reduce((acc, id) => {
    const val = healthStatuses[id];
    let statusText = "Maintenance";
    const lowered = String(val).toLowerCase();

    if (val === true || lowered === "operational" || lowered === "up") {
      statusText = "Operational";
    } else if (lowered === "unstable" || lowered === "slow") {
      statusText = "Unstable";
    }

    acc[id] = statusText;
    return acc;
  }, {});
}

export function getStatusForApp(appStatus, serverHealth, id) {
  const mapped = appStatus?.[id];
  if (mapped) return mapped;

  const raw = serverHealth?.[id];
  if (raw === true) return "Operational";
  if (raw === false) return "Maintenance";
  return "Maintenance";
}

export function statusColor(status) {
  if (!status) return "#E03E3E";
  const normalized = String(status).toLowerCase();
  if (normalized === "operational") return "#00C853";
  if (normalized === "unstable") return "#FF9800";
  return "#E03E3E";
}

export function sortApps(appList, selectedTab, sortOrder, tabs) {
  if (!Array.isArray(appList)) return [];

  if (selectedTab === tabs.Recents) {
    return [...appList]
      .filter((app) => Boolean(app.lastAccessed))
      .sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed));
  }

  if (sortOrder === "none") return appList;

  const sorted = [...appList].sort((a, b) => {
    const at = (a.title || "").toLowerCase();
    const bt = (b.title || "").toLowerCase();
    if (at < bt) return -1;
    if (at > bt) return 1;
    return 0;
  });

  return sortOrder === "az" ? sorted : sorted.reverse();
}

export function filterApps(apps, searchPattern, selectedTab, tabs) {
  if (!Array.isArray(apps)) return [];
  return apps
    .filter((app) => {
      if (!searchPattern) return true;
      const pattern = searchPattern.toLowerCase();
      return (
        (app.title || "").toLowerCase().includes(pattern) ||
        (app.description || "").toLowerCase().includes(pattern)
      );
    })
    .filter((app) => {
      if (selectedTab === tabs.Recents) return Boolean(app.lastAccessed);
      if (selectedTab === tabs.Favorites) return Boolean(app.isFavorite);
      return true;
    });
}

export function isServerSelected(selectedServer, serverOption, fallbackLabel) {
  if (selectedServer === serverOption) return true;
  if (
    selectedServer &&
    typeof selectedServer !== "string" &&
    typeof serverOption !== "string"
  ) {
    return (
      selectedServer.name === serverOption.name ||
      selectedServer.host === serverOption.host
    );
  }
  if (typeof selectedServer === "string") {
    return selectedServer === fallbackLabel;
  }
  return false;
}
