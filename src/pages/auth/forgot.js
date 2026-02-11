import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  FormHelperText,
  Grid,
  InputLabel,
  OutlinedInput,
  Stack,
  Typography,
  Box,
} from "@mui/material";
import KeyboardBackspaceIcon from "@mui/icons-material/KeyboardBackspace";
// third party
import * as Yup from "yup";
import { Formik } from "formik";

// mui-icon
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { LoadingOutlined } from "@ant-design/icons";
import LogoIcon from "../../assets/images/logo_title.png";

import useAuth from "../../hooks/useAuth";
import useSnackbar from "../../hooks/useSnackbar";

// ============================|| AUTHENTICATION - FORGOT PASSWORD ||============================ //

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();
  const { successMessage, errorMessage } = useSnackbar();

  useEffect(() => {
    window.electronAPI.setTitle("Forgot Password");
  }, []);

  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      sx={{
        maxWidth: 400,
        width: "100%",
        minHeight: "100vh",
        color: "white",
        margin: "auto",
      }}
    >
      <Box sx={{ mb: 4 }}>
        <img src={LogoIcon} alt="logo" style={{ height: 24 }} />
      </Box>
      <Formik
        initialValues={{
          email: "",
        }}
        validationSchema={Yup.object().shape({
          email: Yup.string()
            .email("Must be a valid email")
            .max(255)
            .required("Email is required"),
        })}
        onSubmit={async (values, { setSubmitting }) => {
          setSubmitting(true);
          const response = await forgotPassword(values);
          setSubmitting(false);
          if (response.status) {
            successMessage("A code has been sent to your email address.");
            navigate("/auth/reset");
          } else {
            errorMessage(response.message);
          }
        }}
      >
        {({
          handleBlur,
          handleChange,
          handleSubmit,
          errors,
          isSubmitting,
          touched,
          values,
        }) => (
          <form noValidate onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <Typography variant="h5" textAlign="center">
                  <b>Forgot your password?</b>
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="body1" textAlign="center">
                  Please provide your email address and we{"'"}ll send you
                  instructions on how to change your password.
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Stack spacing={1}>
                  <OutlinedInput
                    fullWidth
                    error={Boolean(touched.email && errors.email)}
                    id="email_forgot"
                    type="email"
                    value={values.email}
                    name="email"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    placeholder="Email address"
                    size="small"
                    sx={{ color: "white", bgcolor: "#252731" }}
                  />
                  {touched.email && errors.email && (
                    <FormHelperText error id="helper-text-email_forgot">
                      {errors.email}
                    </FormHelperText>
                  )}
                </Stack>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Button
                  disableElevation
                  disabled={isSubmitting}
                  fullWidth
                  type="submit"
                  variant="contained"
                  color="primary"
                  startIcon={
                    isSubmitting ? <LoadingOutlined /> : <RestartAltIcon />
                  }
                  size="large"
                >
                  Reset
                </Button>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="center"
                  spacing={1}
                >
                  <KeyboardBackspaceIcon />
                  <Typography
                    onClick={() => navigate("/auth/login")}
                    sx={{
                      cursor: "pointer",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    Go Back
                  </Typography>
                </Stack>
              </Grid>
            </Grid>
          </form>
        )}
      </Formik>
    </Stack>
  );
};

export default ForgotPassword;
