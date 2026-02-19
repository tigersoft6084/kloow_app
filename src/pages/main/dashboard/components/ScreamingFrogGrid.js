import React from "react";
import { Box, Button, CardMedia, Grid, Stack, Tooltip, Typography } from "@mui/material";
import UpgradeOutlinedIcon from "@mui/icons-material/UpgradeOutlined";

import ScreamingFrogSeoSpiderLogo from "../../../../assets/images/screaming_frog_seo_spider.png";
import ScreamingFrogLogAnalyserLogo from "../../../../assets/images/screaming_frog_log_analyser.png";

function parseVersion(value) {
  if (value === null || typeof value === "undefined") return null;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function isExactVersion(localVersion, expectedVersion) {
  const local = parseVersion(localVersion);
  const expected = parseVersion(expectedVersion);
  return local !== null && expected !== null && local === expected;
}

function ScreamingFrogCard({
  image,
  title,
  description,
  availableVersion,
  localVersion,
  isBusy,
  isOtherBusy,
  osError,
  onActivate,
  onUpgrade,
}) {
  const canActivate = isExactVersion(localVersion, availableVersion);
  const disabled = isBusy || isOtherBusy || osError || !localVersion || !canActivate;
  const buttonLabel = isBusy
    ? "Downloading..."
    : osError
      ? "Your operating system is not supported."
      : canActivate
        ? "Activate"
        : `Install v${availableVersion} (Default Path)`;

  return (
    <Stack
      spacing={2}
      sx={{
        width: "100%",
        bgcolor: "#2C3145",
        color: "white",
        borderRadius: "20px",
        p: 0.75,
      }}
    >
      <Box sx={{ position: "relative" }}>
        <CardMedia
          component="img"
          image={image}
          alt="App"
          sx={{
            width: "100%",
            height: 320,
            objectFit: "fill",
            borderRadius: "16px",
          }}
        />
      </Box>

      <Stack spacing={1.5} sx={{ p: 1.25 }}>
        <Tooltip title={title} placement="bottom">
          <Typography
            variant="h6"
            component="h2"
            sx={{
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontWeight: "bold",
              fontSize: 20,
              lineHeight: "24px",
              width: "inherit",
            }}
          >
            {title}
          </Typography>
        </Tooltip>

        <Tooltip title={description} placement="bottom">
          <Typography
            variant="body2"
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: "#D9D9D9",
            }}
          >
            {description}
          </Typography>
        </Tooltip>

        <Box sx={{ height: 4 }} />
        {availableVersion ? (
          <Button
            fullWidth
            disableElevation
            variant="contained"
            onClick={disabled ? undefined : onActivate}
            sx={{
              fontWeight: "bold",
              borderRadius: "8px",
              backgroundColor: "#3A71E1",
            }}
            disabled={disabled}
          >
            {buttonLabel}
          </Button>
        ) : (
          <Button
            fullWidth
            disableElevation
            variant="contained"
            onClick={onUpgrade}
            sx={{
              fontWeight: "bold",
              borderRadius: "8px",
              backgroundColor: "#c74ad3",
            }}
          >
            <UpgradeOutlinedIcon />
            UPGRADE
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

export default function ScreamingFrogGrid({
  sf,
  sfInfo,
  isSfssDownloading,
  isSflaDownloading,
  onActivateSfSeoSpider,
  onActivateSfLogAnalyser,
  onUpgrade,
}) {
  return (
    <Grid container spacing={10}>
      <Grid size={6}>
        <ScreamingFrogCard
          image={ScreamingFrogSeoSpiderLogo}
          title="Screaming Frog Seo Spider"
          description="Screaming Frog SEO Spider is a desktop application that crawls websites to identify common technical SEO issues. It mimics how search engine bots crawl a site to extract data like broken links, redirects, duplicate content, and issues with page titles and meta descriptions. This information is then presented in an easily digestible format, often with the option to export it to a spreadsheet for further analysis."
          availableVersion={sf.seo_spider}
          localVersion={sfInfo.seoSpider}
          isBusy={isSfssDownloading}
          isOtherBusy={isSflaDownloading}
          osError={sfInfo.error}
          onActivate={onActivateSfSeoSpider}
          onUpgrade={onUpgrade}
        />
      </Grid>
      <Grid size={6}>
        <ScreamingFrogCard
          image={ScreamingFrogLogAnalyserLogo}
          title="Screaming Frog Log Analyser"
          description="Screaming Frog Log File Analyser is a technical SEO tool for processing and analyzing website server log files to understand search engine bot behavior, improve crawl budget, and identify crawl errors. It allows users to upload various log file formats and then provides data on what URLs were crawled, crawl frequency, response codes, and bot activity. The analysis helps with technical SEO tasks like finding broken links and slow pages."
          availableVersion={sf.log_analyser}
          localVersion={sfInfo.logAnalyser}
          isBusy={isSflaDownloading}
          isOtherBusy={isSfssDownloading}
          osError={sfInfo.error}
          onActivate={onActivateSfLogAnalyser}
          onUpgrade={onUpgrade}
        />
      </Grid>
    </Grid>
  );
}
