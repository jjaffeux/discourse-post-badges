import { ajax } from "discourse/lib/ajax";
import { withPluginApi } from "discourse/lib/plugin-api";
import { iconHTML } from "discourse-common/lib/icon-library";
import { schedule } from "@ember/runloop";

const BADGE_CLASS = [
  "badge-type-gold",
  "badge-type-silver",
  "badge-type-bronze"
];

const USER_BADGE_PAGE = "user's badge page";

function buildBadge(badge, trustLevel, highestBadge) {
  let iconBody;

  if (badge.image) {
    iconBody = `<img src="${badge.image}"/>`;
  } else if (badge.icon) {
    iconBody = iconHTML(badge.icon);
  }

  if (badge.url) {
    const link = document.createElement("a");
    link.setAttribute("href", badge.url);
    link.innerHTML = iconBody;
    iconBody = link;
  }

  if (badge.badgeGroup === 4 && badge.id > highestBadge) {
    highestBadge = badge.id;
    trustLevel = `${badge.name}-highest`;
  }

  const span = document.createElement("span");
  span.classList.add("poster-icon");
  span.classList.add(badge.className);
  span.classList.add(badge.name);
  span.setAttribute("title", badge.title);
  span.appendChild(iconBody);
  return span;
}

function loadUserBadges(username, badgeNames) {
  return ajax(`/user-badges/${username}.json`).then(response => {
    let badgeArray = [];
    let badgePage = "";

    const isUserBadgePage = settings.badge_link_destination === USER_BADGE_PAGE;

    if (isUserBadgePage) {
      badgePage = `?username=${username}`;
    }

    if (response.badges && response.badges.length) {
      badgeNames.forEach(name => {
        response.badges.forEach(badge => {
          if (badge["name"].toLowerCase() === name.toLowerCase()) {
            badgeArray.push({
              icon: badge.icon.replace("fa-", ""),
              image: badge.image,
              className: BADGE_CLASS[badge.badge_type_id - 1],
              name: badge.slug,
              id: badge.id,
              badgeGroup: badge.badge_grouping_id,
              title: badge.description,
              url: `/badges/${badge.id}/${badge.slug}` + badgePage
            });
          }
        });
      });
    }

    return badgeArray;
  });
}

function appendBadges(badges, decorator) {
  const selector = `[data-post-id="${decorator.attrs.id}"] .poster-icon-container`;

  let trustLevel = "";
  let highestBadge = 0;
  const badgesNodes = [];
  badges.forEach(badge =>
    badgesNodes.push(buildBadge(badge, trustLevel, highestBadge))
  );

  schedule("afterRender", () => {
    const postContainer = document.querySelector(selector);
    if (postContainer) {
      postContainer.innerHTML = "";
      trustLevel && postContainer.classList.add(trustLevel);
      badgesNodes.forEach(badgeNode => postContainer.appendChild(badgeNode));
    }
  });
}

export default {
  name: "discourse-post-badges",

  initialize() {
    withPluginApi("0.8.25", api => {
      const isMobileView = Discourse.Site.currentProp("mobileView");
      const location = isMobileView ? "before" : "after";
      const badgeNames = settings.badges.split("|").filter(Boolean);

      api.decorateWidget(`poster-name:${location}`, decorator => {
        const username = decorator.attrs.username;
        loadUserBadges(username, badgeNames).then(badges =>
          appendBadges(badges, decorator)
        );

        return decorator.h("div.poster-icon-container", {}, []);
      });
    });
  }
};
