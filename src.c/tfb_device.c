#include "tfb_device.h"
#include "tfb_internal.h"

tfb_device_t *tfb_device_create(int id, char *name, char *type) {
	tfb_device_t *device;
	device=tfb_malloc(sizeof(tfb_device_t));
	device->id=id;
	device->name=tfb_strdup(name);
	device->type=tfb_strdup(type);

	return device;
}

void tfb_device_dispose(tfb_device_t *device) {
	tfb_free(device->name);
	tfb_free(device->type);
	tfb_free(device);
}
